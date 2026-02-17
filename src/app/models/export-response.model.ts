// Matches your backend ExportResponse class
export interface ExportResponse {
  fileName: string;
  contentType: string;
  data: string;  // Base64 encoded file data
}
