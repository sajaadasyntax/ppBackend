import { describe, it, expect } from '@jest/globals';
import { validateFile, UPLOAD_CATEGORIES, formatFileSize, getContentType } from '../utils/fileValidation';

/**
 * Tests for file validation logic across ALL upload categories.
 *
 * Covers: bulletin, archive, report, voice, receipt — plus edge cases
 * like 0-byte files, oversized files, wrong MIME types, wrong extensions.
 */

describe('validateFile', () => {

  // ── Common edge cases across all categories ──────────────────────

  describe('Common validation rules', () => {
    const categories = Object.keys(UPLOAD_CATEGORIES);

    categories.forEach(cat => {
      it(`${cat}: rejects 0-byte (empty) files`, () => {
        const result = validateFile(cat, 'image/jpeg', 0, 'test.jpg');
        expect(result.valid).toBe(false);
        expect(result.code).toBe('EMPTY_FILE');
      });

      it(`${cat}: rejects negative file size`, () => {
        const result = validateFile(cat, 'image/jpeg', -1, 'test.jpg');
        expect(result.valid).toBe(false);
        expect(result.code).toBe('EMPTY_FILE');
      });

      it(`${cat}: rejects file exceeding max size`, () => {
        const rule = UPLOAD_CATEGORIES[cat];
        const oversized = rule.maxSizeBytes + 1;
        const result = validateFile(cat, 'image/jpeg', oversized, 'test.jpg');
        expect(result.valid).toBe(false);
        expect(result.code).toBe('FILE_TOO_LARGE');
      });
    });

    it('rejects unknown category', () => {
      const result = validateFile('nonexistent', 'image/jpeg', 1024, 'test.jpg');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
    });
  });

  // ── Bulletin ─────────────────────────────────────────────────────

  describe('bulletin category', () => {
    const cat = 'bulletin';

    it('accepts valid JPEG', () => {
      const result = validateFile(cat, 'image/jpeg', 1024, 'photo.jpg');
      expect(result.valid).toBe(true);
    });

    it('accepts valid PNG', () => {
      const result = validateFile(cat, 'image/png', 2048, 'photo.png');
      expect(result.valid).toBe(true);
    });

    it('accepts valid WebP', () => {
      const result = validateFile(cat, 'image/webp', 512, 'photo.webp');
      expect(result.valid).toBe(true);
    });

    it('accepts valid GIF', () => {
      const result = validateFile(cat, 'image/gif', 512, 'photo.gif');
      expect(result.valid).toBe(true);
    });

    it('rejects PDF', () => {
      const result = validateFile(cat, 'application/pdf', 1024, 'doc.pdf');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects SVG', () => {
      const result = validateFile(cat, 'image/svg+xml', 1024, 'icon.svg');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects file over 5MB', () => {
      const result = validateFile(cat, 'image/jpeg', 6 * 1024 * 1024, 'big.jpg');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('FILE_TOO_LARGE');
    });

    it('accepts file exactly at 5MB', () => {
      const result = validateFile(cat, 'image/jpeg', 5 * 1024 * 1024, 'exact.jpg');
      expect(result.valid).toBe(true);
    });

    it('rejects wrong extension even if MIME is correct', () => {
      const result = validateFile(cat, 'image/jpeg', 1024, 'photo.exe');
      expect(result.valid).toBe(false);
    });
  });

  // ── Archive ──────────────────────────────────────────────────────

  describe('archive category', () => {
    const cat = 'archive';

    it('accepts any file type (no restrictions)', () => {
      const result = validateFile(cat, 'application/x-whatever', 1024, 'data.dat');
      expect(result.valid).toBe(true);
    });

    it('accepts PDF', () => {
      const result = validateFile(cat, 'application/pdf', 1024, 'doc.pdf');
      expect(result.valid).toBe(true);
    });

    it('accepts ZIP', () => {
      const result = validateFile(cat, 'application/zip', 1024 * 1024, 'archive.zip');
      expect(result.valid).toBe(true);
    });

    it('rejects file over 50MB', () => {
      const result = validateFile(cat, 'application/pdf', 51 * 1024 * 1024, 'huge.pdf');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('FILE_TOO_LARGE');
    });

    it('accepts 50MB file', () => {
      const result = validateFile(cat, 'application/pdf', 50 * 1024 * 1024, 'exact.pdf');
      expect(result.valid).toBe(true);
    });
  });

  // ── Report ───────────────────────────────────────────────────────

  describe('report category', () => {
    const cat = 'report';

    it('accepts JPEG image', () => {
      const result = validateFile(cat, 'image/jpeg', 1024, 'photo.jpg');
      expect(result.valid).toBe(true);
    });

    it('accepts PDF document', () => {
      const result = validateFile(cat, 'application/pdf', 1024, 'report.pdf');
      expect(result.valid).toBe(true);
    });

    it('accepts Word document (.docx)', () => {
      const result = validateFile(cat, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2048, 'report.docx');
      expect(result.valid).toBe(true);
    });

    it('accepts Excel spreadsheet (.xlsx)', () => {
      const result = validateFile(cat, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 2048, 'data.xlsx');
      expect(result.valid).toBe(true);
    });

    it('rejects audio file', () => {
      const result = validateFile(cat, 'audio/mpeg', 1024, 'sound.mp3');
      expect(result.valid).toBe(false);
    });

    it('rejects video file', () => {
      const result = validateFile(cat, 'video/mp4', 1024, 'video.mp4');
      expect(result.valid).toBe(false);
    });

    it('rejects file over 10MB', () => {
      const result = validateFile(cat, 'application/pdf', 11 * 1024 * 1024, 'huge.pdf');
      expect(result.valid).toBe(false);
    });
  });

  // ── Voice ────────────────────────────────────────────────────────

  describe('voice category', () => {
    const cat = 'voice';

    it('accepts m4a audio', () => {
      const result = validateFile(cat, 'audio/mp4', 1024, 'voice.m4a');
      expect(result.valid).toBe(true);
    });

    it('accepts mp3 audio', () => {
      const result = validateFile(cat, 'audio/mpeg', 2048, 'voice.mp3');
      expect(result.valid).toBe(true);
    });

    it('accepts wav audio', () => {
      const result = validateFile(cat, 'audio/wav', 1024, 'voice.wav');
      expect(result.valid).toBe(true);
    });

    it('accepts webm audio', () => {
      const result = validateFile(cat, 'audio/webm', 1024, 'voice.webm');
      expect(result.valid).toBe(true);
    });

    it('accepts ogg audio', () => {
      const result = validateFile(cat, 'audio/ogg', 1024, 'voice.ogg');
      expect(result.valid).toBe(true);
    });

    it('accepts aac audio', () => {
      const result = validateFile(cat, 'audio/aac', 1024, 'voice.aac');
      expect(result.valid).toBe(true);
    });

    it('rejects image file', () => {
      const result = validateFile(cat, 'image/jpeg', 1024, 'photo.jpg');
      expect(result.valid).toBe(false);
    });

    it('rejects PDF', () => {
      const result = validateFile(cat, 'application/pdf', 1024, 'doc.pdf');
      expect(result.valid).toBe(false);
    });

    it('rejects over 10MB', () => {
      const result = validateFile(cat, 'audio/mp4', 11 * 1024 * 1024, 'long.m4a');
      expect(result.valid).toBe(false);
    });
  });

  // ── Receipt ──────────────────────────────────────────────────────

  describe('receipt category', () => {
    const cat = 'receipt';

    it('accepts JPEG image', () => {
      const result = validateFile(cat, 'image/jpeg', 1024, 'receipt.jpg');
      expect(result.valid).toBe(true);
    });

    it('accepts PNG image', () => {
      const result = validateFile(cat, 'image/png', 2048, 'receipt.png');
      expect(result.valid).toBe(true);
    });

    it('accepts WebP image', () => {
      const result = validateFile(cat, 'image/webp', 512, 'receipt.webp');
      expect(result.valid).toBe(true);
    });

    it('rejects PDF (receipt must be image)', () => {
      const result = validateFile(cat, 'application/pdf', 1024, 'receipt.pdf');
      expect(result.valid).toBe(false);
    });

    it('rejects GIF (not allowed for receipts)', () => {
      const result = validateFile(cat, 'image/gif', 1024, 'receipt.gif');
      expect(result.valid).toBe(false);
    });

    it('rejects over 5MB', () => {
      const result = validateFile(cat, 'image/jpeg', 6 * 1024 * 1024, 'big.jpg');
      expect(result.valid).toBe(false);
    });
  });
});

// ── formatFileSize ─────────────────────────────────────────────────

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB');
  });

  it('handles 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
});

// ── getContentType ─────────────────────────────────────────────────

describe('getContentType', () => {
  it('returns image/jpeg for .jpg', () => {
    expect(getContentType('photo.jpg')).toBe('image/jpeg');
  });

  it('returns image/png for .png', () => {
    expect(getContentType('photo.png')).toBe('image/png');
  });

  it('returns application/pdf for .pdf', () => {
    expect(getContentType('doc.pdf')).toBe('application/pdf');
  });

  it('returns audio/mp4 for .m4a', () => {
    expect(getContentType('voice.m4a')).toBe('audio/mp4');
  });

  it('returns application/octet-stream for unknown extension', () => {
    expect(getContentType('file.xyz')).toBe('application/octet-stream');
  });

  it('handles file with no extension', () => {
    expect(getContentType('noext')).toBe('application/octet-stream');
  });
});
