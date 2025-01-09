export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  PDF_LOAD_ERROR: 'PDF_LOAD_ERROR',
  OCR_ERROR: 'OCR_ERROR',
  IMAGE_PROCESSING_ERROR: 'IMAGE_PROCESSING_ERROR',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  NO_VIN_FOUND: 'NO_VIN_FOUND',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT'
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export interface ErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
    details?: any;
  };
  status: number;
} 