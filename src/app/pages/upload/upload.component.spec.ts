import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { UploadComponent } from './upload.component';
import { StudentService } from '../../services/student.service';

describe('UploadComponent', () => {
  let component: UploadComponent;
  let fixture: ComponentFixture<UploadComponent>;
  let studentServiceMock: any;

  beforeEach(async () => {
    studentServiceMock = {
      uploadCsvToDatabase: vi.fn(),
      getJobStatus: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have no selected file initially', () => {
    expect(component.selectedFile).toBeNull();
  });

  it('should not be processing initially', () => {
    expect(component.isProcessing).toBe(false);
  });

  describe('onFileSelected()', () => {
    it('should set selectedFile when CSV file is selected', () => {
      const mockFile = new File(['id,name\n1,John'], 'data.csv', { type: 'text/csv' });
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(mockEvent);

      expect(component.selectedFile).toBe(mockFile);
    });

    it('should clear previous state when new file selected', () => {
      component.jobInfo = { status: 'COMPLETED', progress: 100, processedCount: 100, totalCount: 100, result: 'Saved 100 records' };
      component.errorMessage = 'Previous error';

      const mockFile = new File(['test'], 'test.csv');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(mockEvent);

      expect(component.jobInfo).toBeNull();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('formatFileSize()', () => {
    it('should format bytes correctly', () => {
      expect(component.formatFileSize(100)).toBe('100 B');
    });

    it('should format KB correctly', () => {
      expect(component.formatFileSize(5120)).toBe('5.0 KB');
    });

    it('should format MB correctly', () => {
      expect(component.formatFileSize(5242880)).toBe('5.0 MB');
    });
  });

  describe('upload()', () => {
    it('should not upload if no file selected', () => {
      component.selectedFile = null;
      component.upload();
      expect(studentServiceMock.uploadCsvToDatabase).not.toHaveBeenCalled();
    });

    it('should call uploadCsvToDatabase with selected file', () => {
      const mockFile = new File(['id,name\n1,John'], 'data.csv', { type: 'text/csv' });
      component.selectedFile = mockFile;

      studentServiceMock.uploadCsvToDatabase.mockReturnValue(of({
        success: true,
        message: 'Job started',
        data: { jobId: 'upload-123' }
      }));
      studentServiceMock.getJobStatus.mockReturnValue(of({
        success: true,
        message: 'Status',
        data: { status: 'PROCESSING', progress: 50, processedCount: 50, totalCount: 100, result: null }
      }));

      component.upload();

      expect(studentServiceMock.uploadCsvToDatabase).toHaveBeenCalledWith(mockFile);
      expect(component.isProcessing).toBe(true);
    });

    it('should set error message on API failure response', () => {
      const mockFile = new File(['test'], 'test.csv');
      component.selectedFile = mockFile;

      studentServiceMock.uploadCsvToDatabase.mockReturnValue(of({
        success: false,
        message: 'Invalid CSV format',
        data: null
      }));

      component.upload();

      expect(component.errorMessage).toBe('Invalid CSV format');
      expect(component.isProcessing).toBe(false);
    });

    it('should set error message on HTTP error', () => {
      const mockFile = new File(['test'], 'test.csv');
      component.selectedFile = mockFile;

      studentServiceMock.uploadCsvToDatabase.mockReturnValue(throwError(() => new Error('Server error')));

      component.upload();

      expect(component.errorMessage).toContain('Failed to start upload');
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('ngOnDestroy()', () => {
    it('should stop polling on destroy', () => {
      const stopPollingSpy = vi.spyOn(component as any, 'stopPolling');
      component.ngOnDestroy();
      expect(stopPollingSpy).toHaveBeenCalled();
    });
  });
});
