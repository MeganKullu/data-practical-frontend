// Matches your backend JobService.JobInfo class
export interface JobInfo {
  status: 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result: string | null;   // File path or error message
  progress: number;        // 0-100 percentage
  processedCount: number;  // Records processed so far
  totalCount: number;      // Total records to process
}
