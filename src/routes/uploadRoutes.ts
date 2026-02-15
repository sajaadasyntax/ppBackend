import express from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as uploadController from '../controllers/uploadController';

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

// ─── Client-facing endpoints ────────────────────────────────────────

// Step 1: Request a presigned upload token (validates type+size before upload)
router.post('/presign', uploadController.requestPresignedUrl);

// Step 2: Complete the upload with the presigned token
router.post('/complete', uploadController.completeUpload);

// Direct upload (backward compatible – single file)
router.post('/direct', uploadController.directUpload);

// Direct upload – multiple files
router.post('/direct-multiple', uploadController.directUploadMultiple);

// Get upload categories config (used by mobile for client-side pre-validation)
router.get('/categories', uploadController.getCategories);

// ─── Admin File Manager endpoints ───────────────────────────────────

// List all uploaded files (with filtering & pagination)
router.get(
  '/files',
  authorize(['ADMIN', 'GENERAL_SECRETARIAT']),
  uploadController.listFiles,
);

// Get upload statistics
router.get(
  '/stats',
  authorize(['ADMIN', 'GENERAL_SECRETARIAT']),
  uploadController.getStats,
);

// Get single file detail
router.get(
  '/files/:id',
  authorize(['ADMIN', 'GENERAL_SECRETARIAT']),
  uploadController.getFile,
);

// Delete a file (soft-delete by default, ?hard=true for permanent)
router.delete(
  '/files/:id',
  authorize(['ADMIN', 'GENERAL_SECRETARIAT']),
  uploadController.removeFile,
);

export default router;
