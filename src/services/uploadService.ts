/**
 * Upload Service – Presigned URL approach
 *
 * Flow:
 *  1. Client calls  POST /api/uploads/presign  with { category, fileName, fileSize, mimeType }
 *  2. Server validates the request against UPLOAD_CATEGORIES rules,
 *     generates a signed JWT "upload token" and returns it + the target URL.
 *  3. Client uploads the file to  POST /api/uploads/complete  sending the
 *     token + the file in multipart form-data.
 *  4. Server verifies the token, re-validates the file, stores it on disk,
 *     and records an entry in the UploadedFile table.
 *
 * Benefits:
 *  - Validation happens BEFORE the file arrives (saves bandwidth on rejection).
 *  - Business controllers never touch multer directly anymore.
 *  - File metadata is always persisted → powers the admin File Manager.
 */

import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { validateFile, UPLOAD_CATEGORIES, formatFileSize } from '../utils/fileValidation';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const UPLOAD_TOKEN_EXPIRY = '15m'; // presigned URL is valid for 15 minutes

// ── Token types ─────────────────────────────────────────────────────
export interface UploadTokenPayload {
  /** upload-specific, not the user auth token */
  type: 'upload';
  category: string;
  fileName: string;
  mimeType: string;
  maxSize: number;
  userId: string;
  /** unique per-token to prevent replay */
  nonce: string;
}

// ── Generate presigned upload token ─────────────────────────────────
export function generatePresignedToken(
  category: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  userId: string,
): { token: string; uploadUrl: string; expiresIn: string } | { error: string; code: string } {
  // 1. Check category exists
  const rule = UPLOAD_CATEGORIES[category];
  if (!rule) {
    return { error: `فئة الرفع غير معروفة: ${category}`, code: 'INVALID_FILE_TYPE' };
  }

  // 2. Pre-validate BEFORE issuing a token
  const validation = validateFile(category, mimeType, fileSize, fileName);
  if (!validation.valid) {
    return { error: validation.error!, code: validation.code! };
  }

  // 3. Sign a JWT
  const nonce = uuidv4();
  const payload: UploadTokenPayload = {
    type: 'upload',
    category,
    fileName,
    mimeType,
    maxSize: rule.maxSizeBytes,
    userId,
    nonce,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: UPLOAD_TOKEN_EXPIRY });

  return {
    token,
    uploadUrl: '/api/uploads/complete',
    expiresIn: UPLOAD_TOKEN_EXPIRY,
  };
}

// ── Verify presigned token ──────────────────────────────────────────
export function verifyPresignedToken(token: string): UploadTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as UploadTokenPayload;
    if (payload.type !== 'upload') return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Store uploaded file on disk + persist metadata ──────────────────
export async function storeFile(
  file: Express.Multer.File,
  category: string,
  userId: string,
): Promise<{ id: string; path: string; url: string }> {
  const rule = UPLOAD_CATEGORIES[category];
  const uploadDir = path.join(process.cwd(), 'public', rule.storagePath);

  // Ensure directory
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const ext = path.extname(file.originalname) || '';
  const storedName = `${category}-${Date.now()}-${uuidv4()}${ext}`;
  const destPath = path.join(uploadDir, storedName);

  // Write to disk (multer with memoryStorage gives us a buffer)
  fs.writeFileSync(destPath, file.buffer);

  const relativePath = `/${rule.storagePath}/${storedName}`;

  // Persist metadata in database
  const record = await prisma.uploadedFile.create({
    data: {
      filename: storedName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      category,
      path: relativePath,
      uploadedBy: userId,
      status: 'active',
    },
  });

  return { id: record.id, path: relativePath, url: relativePath };
}

// ── Get all files (admin file manager) ──────────────────────────────
export async function getAllFiles(filters: {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { category, status = 'active', search, page = 1, limit = 50 } = filters;

  const where: any = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { filename: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [files, total] = await Promise.all([
    prisma.uploadedFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            memberDetails: { select: { fullName: true } },
          },
        },
      },
    }),
    prisma.uploadedFile.count({ where }),
  ]);

  return {
    files,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Get file by ID ──────────────────────────────────────────────────
export async function getFileById(id: string) {
  return prisma.uploadedFile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          memberDetails: { select: { fullName: true } },
        },
      },
    },
  });
}

// ── Soft-delete (mark as deleted) ───────────────────────────────────
export async function deleteFile(id: string, hardDelete = false) {
  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) return null;

  if (hardDelete) {
    // Remove from disk
    const diskPath = path.join(process.cwd(), 'public', file.path);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
    await prisma.uploadedFile.delete({ where: { id } });
  } else {
    await prisma.uploadedFile.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }

  return file;
}

// ── Stats for dashboard ─────────────────────────────────────────────
export async function getUploadStats() {
  const [totalFiles, totalSize, byCategory] = await Promise.all([
    prisma.uploadedFile.count({ where: { status: 'active' } }),
    prisma.uploadedFile.aggregate({
      where: { status: 'active' },
      _sum: { size: true },
    }),
    prisma.uploadedFile.groupBy({
      by: ['category'],
      where: { status: 'active' },
      _count: true,
      _sum: { size: true },
    }),
  ]);

  return {
    totalFiles,
    totalSize: totalSize._sum.size || 0,
    totalSizeFormatted: formatFileSize(totalSize._sum.size || 0),
    byCategory: byCategory.map((c) => ({
      category: c.category,
      label: UPLOAD_CATEGORIES[c.category]?.labelAr || c.category,
      count: c._count,
      size: c._sum.size || 0,
      sizeFormatted: formatFileSize(c._sum.size || 0),
    })),
  };
}
