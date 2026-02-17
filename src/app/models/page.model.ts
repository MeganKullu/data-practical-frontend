// Matches Spring Boot's Page<T> response
export interface Page<T> {
  content: T[];           // The actual data
  totalElements: number;  // Total records in database
  totalPages: number;     // Total pages available
  size: number;           // Page size (records per page)
  number: number;         // Current page number (0-indexed)
  first: boolean;         // Is this the first page?
  last: boolean;          // Is this the last page?
}
