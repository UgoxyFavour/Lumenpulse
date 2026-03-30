export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  errorCode: string;
  timestamp: string;
  path: string;
}
