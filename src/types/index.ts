export interface ProcessingStatus {
  currentPage: number;
  totalPages: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
}

export interface ExtractedVIN {
  pageNumber: number;
  vin: string;
  validationErrors?: string[];
}

export interface AppError {
  message: string;
  errorCode: string;
  statusCode: number;
} 