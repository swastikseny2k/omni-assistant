export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
