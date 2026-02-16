/**
 * Centralised file-validation configuration.
 *
 * Every upload category (bulletin image, archive doc, voice message …)
 * is declared here once.  The presigned-URL generator and the upload
 * endpoint both reference this config so validation is consistent
 * before AND after the file reaches storage.
 */

// ── per-category rules ──────────────────────────────────────────────
export interface CategoryRule {
  /** Human-readable label (used in admin file manager) */
  label: string;
  /** Arabic label */
  labelAr: string;
  /** Allowed MIME types (empty = any) */
  allowedMimeTypes: string[];
  /** Allowed file extensions (lowercase, with leading dot) */
  allowedExtensions: string[];
  /** Max file size in bytes */
  maxSizeBytes: number;
  /** Max number of files per single request */
  maxFiles: number;
  /** Where files are stored on disk (relative to public/) */
  storagePath: string;
}

export const UPLOAD_CATEGORIES: Record<string, CategoryRule> = {
  bulletin: {
    label: 'Bulletin Image',
    labelAr: 'صورة النشرة',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxFiles: 1,
    storagePath: 'uploads/bulletins',
  },
  archive: {
    label: 'Archive Document',
    labelAr: 'وثيقة أرشيف',
    allowedMimeTypes: [], // any type allowed
    allowedExtensions: [], // any extension allowed
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
    maxFiles: 1,
    storagePath: 'uploads/archive',
  },
  report: {
    label: 'Report Attachment',
    labelAr: 'مرفق تقرير',
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
    storagePath: 'uploads/reports',
  },
  voice: {
    label: 'Voice Message',
    labelAr: 'رسالة صوتية',
    allowedMimeTypes: [
      'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac',
    ],
    allowedExtensions: ['.mp3', '.m4a', '.wav', '.webm', '.ogg', '.aac'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxFiles: 1,
    storagePath: 'uploads/voice',
  },
  receipt: {
    label: 'Payment Receipt',
    labelAr: 'إيصال الدفع',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxFiles: 1,
    storagePath: 'uploads/receipts',
  },
};

export type UploadCategory = keyof typeof UPLOAD_CATEGORIES;

// ── validation helpers ──────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validate a file against its category rules **before** the actual upload
 * (used both at presigned-URL creation time and at upload-completion time).
 */
export function validateFile(
  category: string,
  mimeType: string,
  fileSize: number,
  fileName: string,
): ValidationResult {
  const rule = UPLOAD_CATEGORIES[category];
  if (!rule) {
    return { valid: false, error: `Unknown upload category: ${category}`, code: 'INVALID_FILE_TYPE' };
  }

  // Empty file check
  if (!fileSize || fileSize <= 0) {
    return {
      valid: false,
      error: 'الملف فارغ (0 بايت). يرجى اختيار ملف صالح.',
      code: 'EMPTY_FILE' as const,
    };
  }

  // Size check
  if (fileSize > rule.maxSizeBytes) {
    const maxMB = (rule.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `حجم الملف يتجاوز الحد المسموح (${maxMB} ميقابايت)`,
      code: 'FILE_TOO_LARGE',
    };
  }

  // MIME type check (skip if allowedMimeTypes is empty = "any")
  if (rule.allowedMimeTypes.length > 0 && !rule.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المسموحة: ${rule.allowedExtensions.join(', ')}`,
      code: 'INVALID_FILE_TYPE',
    };
  }

  // Extension check (skip if allowedExtensions is empty = "any")
  if (rule.allowedExtensions.length > 0) {
    const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
    if (!rule.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `امتداد الملف غير مدعوم. الامتدادات المسموحة: ${rule.allowedExtensions.join(', ')}`,
        code: 'INVALID_FILE_TYPE',
      };
    }
  }

  return { valid: true };
}

/**
 * Format bytes into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Detect content type from file extension (for download headers).
 */
export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', aac: 'audio/aac',
  };
  return map[ext] || 'application/octet-stream';
}
