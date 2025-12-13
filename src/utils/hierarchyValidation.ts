/**
 * Hierarchy Validation Utilities
 * Centralized validation and normalization for hierarchy entities (codes, names, etc.)
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedValue?: string;
}

/**
 * Normalize a hierarchy entity code
 * - Trims whitespace
 * - Converts to uppercase
 * - Returns undefined if empty after trimming
 */
export function normalizeCode(code: string | undefined | null): string | undefined {
  if (!code || typeof code !== 'string') {
    return undefined;
  }
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.toUpperCase();
}

/**
 * Normalize a hierarchy entity name
 * - Trims whitespace
 * - Returns the trimmed name
 */
export function normalizeName(name: string | undefined | null): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name.trim();
}

/**
 * Normalize a description field
 * - Trims whitespace
 * - Returns undefined if empty after trimming
 */
export function normalizeDescription(description: string | undefined | null): string | undefined {
  if (!description || typeof description !== 'string') {
    return undefined;
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

/**
 * Validate that a name is not empty
 */
export function validateRequiredName(name: string | undefined | null): ValidationResult {
  const normalized = normalizeName(name);
  if (!normalized || normalized.length === 0) {
    return {
      isValid: false,
      error: 'Name is required'
    };
  }
  return {
    isValid: true,
    normalizedValue: normalized
  };
}

/**
 * Validate code format (alphanumeric, hyphens, underscores only)
 */
export function validateCodeFormat(code: string | undefined | null): ValidationResult {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { isValid: true, normalizedValue: undefined }; // Code is optional
  }
  
  // Allow alphanumeric, hyphens, underscores
  const validPattern = /^[A-Z0-9\-_]+$/;
  if (!validPattern.test(normalized)) {
    return {
      isValid: false,
      error: 'Code can only contain letters, numbers, hyphens, and underscores'
    };
  }
  
  return {
    isValid: true,
    normalizedValue: normalized
  };
}

/**
 * Prepare hierarchy entity data for creation/update
 * Normalizes all common fields
 */
export function prepareHierarchyData(data: {
  name?: string;
  code?: string;
  description?: string;
}): {
  name: string;
  code: string | undefined;
  description: string | undefined;
  isValid: boolean;
  error?: string;
} {
  const nameValidation = validateRequiredName(data.name);
  if (!nameValidation.isValid) {
    return {
      name: '',
      code: undefined,
      description: undefined,
      isValid: false,
      error: nameValidation.error
    };
  }
  
  const codeValidation = validateCodeFormat(data.code);
  if (!codeValidation.isValid) {
    return {
      name: nameValidation.normalizedValue!,
      code: undefined,
      description: undefined,
      isValid: false,
      error: codeValidation.error
    };
  }
  
  return {
    name: nameValidation.normalizedValue!,
    code: codeValidation.normalizedValue,
    description: normalizeDescription(data.description),
    isValid: true
  };
}

/**
 * Check if a Prisma error is a unique constraint violation
 */
export function isUniqueConstraintError(error: any): boolean {
  return error?.code === 'P2002';
}

/**
 * Check if a Prisma error is a record not found error
 */
export function isNotFoundError(error: any): boolean {
  return error?.code === 'P2025';
}

/**
 * Check if a Prisma error is a foreign key constraint error
 */
export function isForeignKeyError(error: any): boolean {
  return error?.code === 'P2003';
}

/**
 * Get user-friendly error message for Prisma constraint errors
 */
export function getConstraintErrorMessage(error: any, entityType: string): string {
  if (isUniqueConstraintError(error)) {
    return `A ${entityType} with this code already exists`;
  }
  if (isForeignKeyError(error)) {
    return `Cannot delete ${entityType} with associated child records`;
  }
  if (isNotFoundError(error)) {
    return `${entityType} not found`;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if the updatedAt timestamp matches (for optimistic locking)
 * Returns true if timestamps match (or no lock provided), false if conflict detected
 */
export function checkOptimisticLock(dbUpdatedAt: Date, clientUpdatedAt?: string | Date): boolean {
  if (!clientUpdatedAt) {
    // No lock provided by client, allow the update
    return true;
  }
  
  const clientTime = typeof clientUpdatedAt === 'string' 
    ? new Date(clientUpdatedAt) 
    : clientUpdatedAt;
  
  // Compare timestamps (allow 1 second tolerance for network delays)
  const timeDiff = Math.abs(dbUpdatedAt.getTime() - clientTime.getTime());
  return timeDiff < 1000;
}

/**
 * Error class for optimistic lock conflicts
 */
export class OptimisticLockError extends Error {
  code = 'OPTIMISTIC_LOCK_CONFLICT';
  
  constructor(entityType: string) {
    super(`The ${entityType} has been modified by another user. Please refresh and try again.`);
    this.name = 'OptimisticLockError';
  }
}
