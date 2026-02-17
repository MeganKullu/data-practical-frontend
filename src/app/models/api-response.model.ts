// Matches your backend ApiResponse<T> class
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
