import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, JobInfo, Student, StudentClass, Page, ExportResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);

  // Base URL 
  private apiUrl = '/api/students';

  // A) GENERATE EXCEL
  /**
   * Start Excel generation with specified number of records
   * Returns a jobId to track progress
   */
  generateExcel(count: number): Observable<ApiResponse<{ jobId: string }>> {
    return this.http.post<ApiResponse<{ jobId: string }>>(
      `${this.apiUrl}/generate`,
      null,  // No body needed
      { params: { count: count.toString() } }
    );
  }

  // B) PROCESS EXCEL TO CSV
  /**
   * Upload Excel file and convert to CSV
   * Returns a jobId to track progress
   */
  processExcelToCsv(file: File): Observable<ApiResponse<{ jobId: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<{ jobId: string }>>(
      `${this.apiUrl}/process`,
      formData
    );
  }

  // C) UPLOAD CSV TO DATABASE
  /**
   * Upload CSV file and save to database
   * Returns a jobId to track progress
   */
  uploadCsvToDatabase(file: File): Observable<ApiResponse<{ jobId: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<{ jobId: string }>>(
      `${this.apiUrl}/upload`,
      formData
    );
  }

  // JOB STATUS POLLING
  /**
   * Check the status of a running job
   * Called repeatedly to track progress
   */
  getJobStatus(jobId: string): Observable<ApiResponse<JobInfo>> {
    return this.http.get<ApiResponse<JobInfo>>(
      `${this.apiUrl}/status/${jobId}`
    );
  }

  // D) REPORT - GET STUDENTS
  
  //Get paginated list of students with optional filters
   
  getStudents(
    page: number = 0,
    size: number = 20,
    studentId?: number,
    studentClass?: StudentClass,
    sortBy: string = 'studentId',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<ApiResponse<Page<Student>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    // Optional filters
    if (studentId) {
      params = params.set('studentId', studentId.toString());
    }
    if (studentClass) {
      params = params.set('studentClass', studentClass);
    }

    return this.http.get<ApiResponse<Page<Student>>>(
      `${this.apiUrl}/report`,
      { params }
    );
  }

  // D) REPORT - EXPORTS

  //Export students to CSV
  exportToCsv(studentId?: number, studentClass?: StudentClass): Observable<ApiResponse<ExportResponse>> {
    let params = new HttpParams();
    if (studentId) params = params.set('studentId', studentId.toString());
    if (studentClass) params = params.set('studentClass', studentClass);

    return this.http.get<ApiResponse<ExportResponse>>(
      `${this.apiUrl}/report/export/csv`,
      { params }
    );
  }

  // Export students to Excel
  exportToExcel(studentId?: number, studentClass?: StudentClass): Observable<ApiResponse<ExportResponse>> {
    let params = new HttpParams();
    if (studentId) params = params.set('studentId', studentId.toString());
    if (studentClass) params = params.set('studentClass', studentClass);

    return this.http.get<ApiResponse<ExportResponse>>(
      `${this.apiUrl}/report/export/excel`,
      { params }
    );
  }

  // Export students to PDF
  exportToPdf(studentId?: number, studentClass?: StudentClass): Observable<ApiResponse<ExportResponse>> {
    let params = new HttpParams();
    if (studentId) params = params.set('studentId', studentId.toString());
    if (studentClass) params = params.set('studentClass', studentClass);

    return this.http.get<ApiResponse<ExportResponse>>(
      `${this.apiUrl}/report/export/pdf`,
      { params }
    );
  }
}
