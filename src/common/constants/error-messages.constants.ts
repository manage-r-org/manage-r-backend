export const ERROR_MESSAGES = {
  // Generic
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  NOT_FOUND: (resource: string) => `${resource} not found.`,
  ALREADY_EXISTS: (resource: string) => `${resource} already exists.`,
  VALIDATION_FAILED: 'Validation failed.',
  UNAUTHORIZED: 'Unauthorized. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  BAD_REQUEST: 'Bad request.',

  // Auth
  INVALID_CREDENTIALS: 'Invalid credentials.',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token.',
  TOKEN_EXPIRED: 'Token has expired.',
  TOKEN_INVALID: 'Token is invalid.',
  ACCOUNT_DISABLED: 'Your account has been disabled.',

  // User
  USER_NOT_FOUND: 'User not found.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
} as const;
