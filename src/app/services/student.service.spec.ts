import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StudentService } from './student.service';
import { environment } from '../../environments/environment';

describe('StudentService', () => {
  let service: StudentService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StudentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(StudentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateExcel', () => {
    it('should call POST /generate with count param', () => {
      const mockResponse = { success: true, message: 'Job started', data: { jobId: 'test-job-123' } };

      service.generateExcel(1000).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.jobId).toBe('test-job-123');
      });

      const req = httpMock.expectOne(`${apiUrl}/generate?count=1000`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('processExcelToCsv', () => {
    it('should call POST /process with file in FormData', () => {
      const mockFile = new File(['test'], 'test.xlsx');
      const mockResponse = { success: true, message: 'Job started', data: { jobId: 'process-job-123' } };

      service.processExcelToCsv(mockFile).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.jobId).toBe('process-job-123');
      });

      const req = httpMock.expectOne(`${apiUrl}/process`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('uploadCsvToDatabase', () => {
    it('should call POST /upload with file in FormData', () => {
      const mockFile = new File(['test,data'], 'test.csv');
      const mockResponse = { success: true, message: 'Job started', data: { jobId: 'upload-job-123' } };

      service.uploadCsvToDatabase(mockFile).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.jobId).toBe('upload-job-123');
      });

      const req = httpMock.expectOne(`${apiUrl}/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('getJobStatus', () => {
    it('should call GET /status/{jobId}', () => {
      const jobId = 'test-job-123';
      const mockResponse = {
        success: true,
        message: 'Status retrieved',
        data: { status: 'PROCESSING', progress: 50, processedCount: 500, totalCount: 1000, result: null }
      };

      service.getJobStatus(jobId).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('PROCESSING');
      });

      const req = httpMock.expectOne(`${apiUrl}/status/${jobId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getStudents', () => {
    it('should call GET /report with pagination params', () => {
      const mockResponse = {
        success: true,
        message: 'Report data retrieved',
        data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true }
      };

      service.getStudents(0, 20).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(request => request.url === `${apiUrl}/report`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(mockResponse);
    });

    it('should include filters when provided', () => {
      const mockResponse = {
        success: true,
        message: 'Report data retrieved',
        data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true }
      };

      service.getStudents(0, 20, 123, 'Class1').subscribe();

      const req = httpMock.expectOne(request => request.url === `${apiUrl}/report`);
      expect(req.request.params.get('studentId')).toBe('123');
      expect(req.request.params.get('studentClass')).toBe('Class1');
      req.flush(mockResponse);
    });
  });

  describe('export methods', () => {
    it('exportToCsv should call GET /report/export/csv', () => {
      const mockResponse = { success: true, message: 'Export successful', data: { data: 'base64', fileName: 'export.csv', contentType: 'text/csv' } };

      service.exportToCsv().subscribe(response => {
        expect(response.data.fileName).toBe('export.csv');
      });

      const req = httpMock.expectOne(request => request.url === `${apiUrl}/report/export/csv`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('exportToExcel should call GET /report/export/excel', () => {
      const mockResponse = { success: true, message: 'Export successful', data: { data: 'base64', fileName: 'export.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } };

      service.exportToExcel().subscribe(response => {
        expect(response.data.fileName).toBe('export.xlsx');
      });

      const req = httpMock.expectOne(request => request.url === `${apiUrl}/report/export/excel`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('exportToPdf should call GET /report/export/pdf', () => {
      const mockResponse = { success: true, message: 'Export successful', data: { data: 'base64', fileName: 'export.pdf', contentType: 'application/pdf' } };

      service.exportToPdf().subscribe(response => {
        expect(response.data.fileName).toBe('export.pdf');
      });

      const req = httpMock.expectOne(request => request.url === `${apiUrl}/report/export/pdf`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('downloadFile', () => {
    it('should open download URL in new window', () => {
      const jobId = 'test-job-123';
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      service.downloadFile(jobId);

      expect(openSpy).toHaveBeenCalledWith(`${apiUrl}/download/${jobId}`, '_blank');
      openSpy.mockRestore();
    });
  });
});
