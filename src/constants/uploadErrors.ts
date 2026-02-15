/**
 * Shared upload/download error constants.
 * These EXACT messages are reused on the Mobile app and Admin portal
 * so that end-users always see the same wording regardless of client.
 *
 * Convention:
 *   - `code`  : stable English key used in JSON responses  (e.g. "FILE_TOO_LARGE")
 *   - `message`: Arabic-friendly string shown to the user
 *   - `status` : recommended HTTP status code
 */

export interface UploadError {
  code: string;
  message: string;
  status: number;
}

// ─── file-level validation ──────────────────────────────────────────
export const FILE_TOO_LARGE: UploadError = {
  code: 'FILE_TOO_LARGE',
  message: 'حجم الملف يتجاوز الحد المسموح',
  status: 413,
};

export const INVALID_FILE_TYPE: UploadError = {
  code: 'INVALID_FILE_TYPE',
  message: 'نوع الملف غير مدعوم',
  status: 415,
};

export const NO_FILE_PROVIDED: UploadError = {
  code: 'NO_FILE_PROVIDED',
  message: 'لم يتم تحديد ملف للرفع',
  status: 400,
};

export const TOO_MANY_FILES: UploadError = {
  code: 'TOO_MANY_FILES',
  message: 'عدد الملفات يتجاوز الحد المسموح',
  status: 400,
};

// ─── presigned-url / token errors ───────────────────────────────────
export const UPLOAD_TOKEN_EXPIRED: UploadError = {
  code: 'UPLOAD_TOKEN_EXPIRED',
  message: 'انتهت صلاحية رابط الرفع. يرجى طلب رابط جديد',
  status: 401,
};

export const UPLOAD_TOKEN_INVALID: UploadError = {
  code: 'UPLOAD_TOKEN_INVALID',
  message: 'رابط الرفع غير صالح',
  status: 401,
};

export const FILE_MISMATCH: UploadError = {
  code: 'FILE_MISMATCH',
  message: 'الملف لا يطابق المواصفات المطلوبة',
  status: 400,
};

// ─── network / server ───────────────────────────────────────────────
export const NETWORK_TIMEOUT: UploadError = {
  code: 'NETWORK_TIMEOUT',
  message: 'انتهت مهلة الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى',
  status: 408,
};

export const UPLOAD_FAILED: UploadError = {
  code: 'UPLOAD_FAILED',
  message: 'فشل رفع الملف. يرجى المحاولة مرة أخرى',
  status: 500,
};

export const DOWNLOAD_FAILED: UploadError = {
  code: 'DOWNLOAD_FAILED',
  message: 'فشل تحميل الملف. يرجى المحاولة مرة أخرى',
  status: 500,
};

export const FILE_NOT_FOUND: UploadError = {
  code: 'FILE_NOT_FOUND',
  message: 'الملف غير موجود',
  status: 404,
};

export const UPLOAD_CANCELLED: UploadError = {
  code: 'UPLOAD_CANCELLED',
  message: 'تم إلغاء الرفع',
  status: 499,
};

export const SERVER_ERROR: UploadError = {
  code: 'SERVER_ERROR',
  message: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
  status: 500,
};

// ─── permission errors ──────────────────────────────────────────────
export const UNAUTHORIZED_UPLOAD: UploadError = {
  code: 'UNAUTHORIZED_UPLOAD',
  message: 'ليس لديك صلاحية رفع الملفات',
  status: 403,
};

export const UNAUTHORIZED_DELETE: UploadError = {
  code: 'UNAUTHORIZED_DELETE',
  message: 'ليس لديك صلاحية حذف هذا الملف',
  status: 403,
};

// ─── Lookup helper ──────────────────────────────────────────────────
const ALL_ERRORS: Record<string, UploadError> = {
  FILE_TOO_LARGE,
  INVALID_FILE_TYPE,
  NO_FILE_PROVIDED,
  TOO_MANY_FILES,
  UPLOAD_TOKEN_EXPIRED,
  UPLOAD_TOKEN_INVALID,
  FILE_MISMATCH,
  NETWORK_TIMEOUT,
  UPLOAD_FAILED,
  DOWNLOAD_FAILED,
  FILE_NOT_FOUND,
  UPLOAD_CANCELLED,
  SERVER_ERROR,
  UNAUTHORIZED_UPLOAD,
  UNAUTHORIZED_DELETE,
};

/**
 * Get a full UploadError object by its code string.
 * Falls back to SERVER_ERROR if code is unknown.
 */
export function getUploadError(code: string): UploadError {
  return ALL_ERRORS[code] ?? SERVER_ERROR;
}
