/**
 * Mobile Number Normalization Utility
 * Ensures all mobile numbers are in E.164 format: +249XXXXXXXXX
 */

/**
 * Normalize a mobile number to E.164 format for Sudan (+249)
 * @param {string} mobile - Mobile number in various formats
 * @returns {string} - Normalized mobile number in E.164 format
 */
function normalizeMobileNumber(mobile) {
  if (!mobile) {
    throw new Error('Mobile number is required');
  }

  // Remove all whitespace and special characters except +
  let cleaned = mobile.toString().replace(/[\s\-().]/g, '');

  // If already starts with +249, validate and return
  if (cleaned.startsWith('+249')) {
    // Remove the +249 prefix to validate the rest
    const number = cleaned.substring(4);
    if (!/^\d{9}$/.test(number)) {
      throw new Error('Invalid mobile number format. Expected 9 digits after +249');
    }
    return cleaned;
  }

  // If starts with 249, add the +
  if (cleaned.startsWith('249')) {
    const number = cleaned.substring(3);
    if (!/^\d{9}$/.test(number)) {
      throw new Error('Invalid mobile number format. Expected 9 digits after 249');
    }
    return `+${cleaned}`;
  }

  // If starts with 0, remove it and add +249
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Validate that we have 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    throw new Error(`Invalid mobile number format. Expected 9 digits, got: ${cleaned}`);
  }

  // Add Sudan country code
  return `+249${cleaned}`;
}

/**
 * Check if a mobile number is valid
 * @param {string} mobile - Mobile number to validate
 * @returns {boolean} - True if valid
 */
function isValidMobileNumber(mobile) {
  try {
    normalizeMobileNumber(mobile);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  normalizeMobileNumber,
  isValidMobileNumber
};

