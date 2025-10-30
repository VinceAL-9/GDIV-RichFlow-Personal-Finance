import validator from 'validator';

/**
 * Sanitize user input by trimming and escaping
 * @param input - Raw input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return validator.escape(validator.trim(input));
}

/**
 * Normalize and sanitize email
 * @param email - Raw email string
 * @returns Normalized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  return validator.normalizeEmail(email) || '';
}

/**
 * Validate name format and length
 * @param name - Name to validate
 * @returns Object with isValid and error message
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  if (name.length < 3 || name.length > 50) {
    return {
      isValid: false,
      error: 'Name must be between 3 and 50 characters'
    };
  }
  return { isValid: true };
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Object with isValid and error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!validator.isEmail(email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }
  return { isValid: true };
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      isValid: false,
      error: 'Password must contain uppercase, lowercase, and numbers'
    };
  }

  return { isValid: true };
}
