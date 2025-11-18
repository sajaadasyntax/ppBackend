/**
 * Normalize mobile numbers to E.164 format
 * Supports various input formats and converts them to +249XXXXXXXXX
 */

export function normalizeMobileNumber(mobileNumber: string): string {
  if (!mobileNumber) {
    throw new Error('Mobile number is required');
  }

  // Remove all non-digit characters except +
  let cleaned = mobileNumber.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+249')) {
    // Already in international format
    return cleaned;
  } else if (cleaned.startsWith('249')) {
    // Missing + prefix
    return '+' + cleaned;
  } else if (cleaned.startsWith('009249')) {
    // Double zero format
    return '+' + cleaned.substring(2);
  } else if (cleaned.startsWith('00249')) {
    // Double zero format (alternative)
    return '+' + cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    // Local format (0XXXXXXXXX)
    return '+249' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Just the 9 digits without prefix
    return '+249' + cleaned;
  } else {
    // Assume it's already in correct format or try to fix
    if (cleaned.length >= 9 && cleaned.length <= 12) {
      // Try to extract the last 9 digits
      const last9 = cleaned.slice(-9);
      return '+249' + last9;
    }
    throw new Error(`Invalid mobile number format: ${mobileNumber}`);
  }
}

export function validateMobileNumber(mobileNumber: string): boolean {
  try {
    const normalized = normalizeMobileNumber(mobileNumber);
    // E.164 format for Sudan: +249 followed by 9 digits
    const sudanMobileRegex = /^\+249[0-9]{9}$/;
    return sudanMobileRegex.test(normalized);
  } catch {
    return false;
  }
}

