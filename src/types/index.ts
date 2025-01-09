export interface ProcessingStatus {
  currentPage: number;
  totalPages: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

export interface ExtractedVIN {
  pageNumber: number;
  vin: string;
  confidence: number;
  validationErrors?: string[];
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessingError {
  page: number;
  error: string;
} 