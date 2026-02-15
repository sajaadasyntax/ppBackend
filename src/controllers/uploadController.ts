/**
 * Upload Controller
 *
 * Provides the presigned-URL endpoints and file management for the admin File Manager.
 */

import { Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthenticatedRequest } from '../types';
import { validateFile, UPLOAD_CATEGORIES } from '../utils/fileValidation';
import * as uploadService from '../services/uploadService';
import {
  FILE_TOO_LARGE,
  INVALID_FILE_TYPE,
  NO_FILE_PROVIDED,
  UPLOAD_TOKEN_EXPIRED,
  UPLOAD_TOKEN_INVALID,
  FILE_MISMATCH,
  UPLOAD_FAILED,
  FILE_NOT_FOUND,
  SERVER_ERROR,
} from '../constants/uploadErrors';

// We use memoryStorage so the file buffer is available for validation + disk write
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB absolute maximum (per-category limits enforced separately)
});

// ─── 1) Request a presigned upload token ────────────────────────────
export const requestPresignedUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { category, fileName, fileSize, mimeType } = req.body;

    if (!category || !fileName || !fileSize || !mimeType) {
      res.status(400).json({
        error: 'الحقول المطلوبة: category, fileName, fileSize, mimeType',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    const result = uploadService.generatePresignedToken(category, fileName, fileSize, mimeType, userId);

    if ('error' in result) {
      const status = result.code === 'FILE_TOO_LARGE' ? FILE_TOO_LARGE.status
        : result.code === 'INVALID_FILE_TYPE' ? INVALID_FILE_TYPE.status
        : 400;
      res.status(status).json({ error: result.error, code: result.code });
      return;
    }

    res.json({
      uploadToken: result.token,
      uploadUrl: result.uploadUrl,
      expiresIn: result.expiresIn,
      maxSize: UPLOAD_CATEGORIES[category]?.maxSizeBytes,
      allowedTypes: UPLOAD_CATEGORIES[category]?.allowedMimeTypes,
    });
  } catch (error: any) {
    console.error('Error in requestPresignedUrl:', error);
    res.status(SERVER_ERROR.status).json({ error: SERVER_ERROR.message, code: SERVER_ERROR.code });
  }
};

// ─── 2) Complete the upload using the presigned token ────────────────
export const completeUpload = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  memUpload.single('file')(req as any, res, async (multerErr: any) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        res.status(FILE_TOO_LARGE.status).json({ error: FILE_TOO_LARGE.message, code: FILE_TOO_LARGE.code });
      } else {
        res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
      }
      return;
    }

    try {
      const uploadToken = (req as any).body.uploadToken || req.headers['x-upload-token'];
      if (!uploadToken) {
        res.status(UPLOAD_TOKEN_INVALID.status).json({
          error: UPLOAD_TOKEN_INVALID.message,
          code: UPLOAD_TOKEN_INVALID.code,
        });
        return;
      }

      // Verify token
      const payload = uploadService.verifyPresignedToken(uploadToken as string);
      if (!payload) {
        res.status(UPLOAD_TOKEN_EXPIRED.status).json({
          error: UPLOAD_TOKEN_EXPIRED.message,
          code: UPLOAD_TOKEN_EXPIRED.code,
        });
        return;
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(NO_FILE_PROVIDED.status).json({
          error: NO_FILE_PROVIDED.message,
          code: NO_FILE_PROVIDED.code,
        });
        return;
      }

      // Re-validate file against the token claims (defence-in-depth)
      const validation = validateFile(payload.category, file.mimetype, file.size, file.originalname);
      if (!validation.valid) {
        res.status(FILE_MISMATCH.status).json({
          error: validation.error,
          code: FILE_MISMATCH.code,
        });
        return;
      }

      // Store on disk + record in DB
      const result = await uploadService.storeFile(file, payload.category, payload.userId);

      res.status(201).json({
        message: 'تم رفع الملف بنجاح',
        file: {
          id: result.id,
          url: result.url,
          path: result.path,
        },
      });
    } catch (error: any) {
      console.error('Error in completeUpload:', error);
      res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
    }
  });
};

// ─── 3) Direct upload (backward compatible – no presigned token) ────
export const directUpload = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  memUpload.single('file')(req as any, res, async (multerErr: any) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        res.status(FILE_TOO_LARGE.status).json({ error: FILE_TOO_LARGE.message, code: FILE_TOO_LARGE.code });
      } else {
        res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
      }
      return;
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = (req as any).body.category || req.query.category;
      if (!category || !UPLOAD_CATEGORIES[category as string]) {
        res.status(400).json({ error: 'فئة الرفع مطلوبة', code: 'MISSING_CATEGORY' });
        return;
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(NO_FILE_PROVIDED.status).json({
          error: NO_FILE_PROVIDED.message,
          code: NO_FILE_PROVIDED.code,
        });
        return;
      }

      // Validate
      const validation = validateFile(category as string, file.mimetype, file.size, file.originalname);
      if (!validation.valid) {
        const status = validation.code === 'FILE_TOO_LARGE' ? FILE_TOO_LARGE.status : INVALID_FILE_TYPE.status;
        res.status(status).json({ error: validation.error, code: validation.code });
        return;
      }

      // Store
      const result = await uploadService.storeFile(file, category as string, userId);

      res.status(201).json({
        message: 'تم رفع الملف بنجاح',
        file: {
          id: result.id,
          url: result.url,
          path: result.path,
        },
      });
    } catch (error: any) {
      console.error('Error in directUpload:', error);
      res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
    }
  });
};

// ─── 4) Multi-file direct upload ────────────────────────────────────
export const directUploadMultiple = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  memUpload.array('files', 5)(req as any, res, async (multerErr: any) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        res.status(FILE_TOO_LARGE.status).json({ error: FILE_TOO_LARGE.message, code: FILE_TOO_LARGE.code });
      } else {
        res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
      }
      return;
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = (req as any).body.category || req.query.category;
      if (!category || !UPLOAD_CATEGORIES[category as string]) {
        res.status(400).json({ error: 'فئة الرفع مطلوبة', code: 'MISSING_CATEGORY' });
        return;
      }

      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(NO_FILE_PROVIDED.status).json({
          error: NO_FILE_PROVIDED.message,
          code: NO_FILE_PROVIDED.code,
        });
        return;
      }

      const rule = UPLOAD_CATEGORIES[category as string];
      if (files.length > rule.maxFiles) {
        res.status(400).json({
          error: `الحد الأقصى ${rule.maxFiles} ملفات`,
          code: 'TOO_MANY_FILES',
        });
        return;
      }

      // Validate all files first
      for (const file of files) {
        const validation = validateFile(category as string, file.mimetype, file.size, file.originalname);
        if (!validation.valid) {
          const status = validation.code === 'FILE_TOO_LARGE' ? FILE_TOO_LARGE.status : INVALID_FILE_TYPE.status;
          res.status(status).json({
            error: `${file.originalname}: ${validation.error}`,
            code: validation.code,
          });
          return;
        }
      }

      // Store all files
      const results: { id: string; path: string; url: string }[] = [];
      for (const file of files) {
        const result = await uploadService.storeFile(file, category as string, userId);
        results.push(result);
      }

      res.status(201).json({
        message: 'تم رفع الملفات بنجاح',
        files: results.map((r) => ({ id: r.id, url: r.url, path: r.path })),
      });
    } catch (error: any) {
      console.error('Error in directUploadMultiple:', error);
      res.status(UPLOAD_FAILED.status).json({ error: UPLOAD_FAILED.message, code: UPLOAD_FAILED.code });
    }
  });
};

// ─── 5) Admin: List files (File Manager) ────────────────────────────
export const listFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  try {
    const { category, status, search, page, limit } = req.query;
    const result = await uploadService.getAllFiles({
      category: category as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error in listFiles:', error);
    res.status(SERVER_ERROR.status).json({ error: SERVER_ERROR.message, code: SERVER_ERROR.code });
  }
};

// ─── 6) Admin: Get upload statistics ────────────────────────────────
export const getStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  try {
    const stats = await uploadService.getUploadStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error in getStats:', error);
    res.status(SERVER_ERROR.status).json({ error: SERVER_ERROR.message, code: SERVER_ERROR.code });
  }
};

// ─── 7) Admin: Get file detail ──────────────────────────────────────
export const getFile = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  try {
    const file = await uploadService.getFileById(req.params.id);
    if (!file) {
      res.status(FILE_NOT_FOUND.status).json({ error: FILE_NOT_FOUND.message, code: FILE_NOT_FOUND.code });
      return;
    }
    res.json(file);
  } catch (error: any) {
    console.error('Error in getFile:', error);
    res.status(SERVER_ERROR.status).json({ error: SERVER_ERROR.message, code: SERVER_ERROR.code });
  }
};

// ─── 8) Admin: Delete file ──────────────────────────────────────────
export const removeFile = async (
  req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  try {
    const hardDelete = req.query.hard === 'true';
    const file = await uploadService.deleteFile(req.params.id, hardDelete);
    if (!file) {
      res.status(FILE_NOT_FOUND.status).json({ error: FILE_NOT_FOUND.message, code: FILE_NOT_FOUND.code });
      return;
    }
    res.json({ message: 'تم حذف الملف بنجاح', file });
  } catch (error: any) {
    console.error('Error in removeFile:', error);
    res.status(SERVER_ERROR.status).json({ error: SERVER_ERROR.message, code: SERVER_ERROR.code });
  }
};

// ─── 9) Get upload categories config (for clients) ──────────────────
export const getCategories = async (
  _req: AuthenticatedRequest,
  res: Response,
  _next?: NextFunction,
): Promise<void> => {
  const categories = Object.entries(UPLOAD_CATEGORIES).map(([key, rule]) => ({
    key,
    label: rule.label,
    labelAr: rule.labelAr,
    allowedMimeTypes: rule.allowedMimeTypes,
    allowedExtensions: rule.allowedExtensions,
    maxSizeBytes: rule.maxSizeBytes,
    maxFiles: rule.maxFiles,
  }));
  res.json(categories);
};
