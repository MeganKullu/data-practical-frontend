import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ProcessComponent } from './process.component';
import { StudentService } from '../../services/student.service';

describe('ProcessComponent', () => {
  let component: ProcessComponent;
  let fixture: ComponentFixture<ProcessComponent>;
  let studentServiceMock: any;

  beforeEach(async () => {
    studentServiceMock = {
      processExcelToCsv: vi.fn(),
      getJobStatus: vi.fn(),
      downloadFile: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProcessComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessComponent);
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
    it('should set selectedFile when file is selected', () => {
      const mockFile = new File(['test'], 'test.xlsx');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(mockEvent);

      expect(component.selectedFile).toBe(mockFile);
    });

    it('should clear jobInfo and errorMessage when new file selected', () => {
      component.jobInfo = { status: 'COMPLETED', progress: 100, processedCount: 100, totalCount: 100, result: 'test' };
      component.errorMessage = 'Some error';

      const mockFile = new File(['test'], 'test.xlsx');
      const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

      component.onFileSelected(mockEvent);

      expect(component.jobInfo).toBeNull();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('formatFileSize()', () => {
    it('should format bytes correctly', () => {
      expect(component.formatFileSize(500)).toBe('500 B');
    });

    it('should format KB correctly', () => {
      expect(component.formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format MB correctly', () => {
      expect(component.formatFileSize(2097152)).toBe('2.0 MB');
    });
  });

  describe('process()', () => {
    it('should not process if no file selected', () => {
      component.selectedFile = null;
      component.process();
      expect(studentServiceMock.processExcelToCsv).not.toHaveBeenCalled();
    });

    it('should call processExcelToCsv with selected file', () => {
      const mockFile = new File(['test'], 'test.xlsx');
      component.selectedFile = mockFile;

      studentServiceMock.processExcelToCsv.mockReturnValue(of({
        success: true,
        message: 'Job started',
        data: { jobId: 'process-123' }
      }));
      studentServiceMock.getJobStatus.mockReturnValue(of({
        success: true,
        message: 'Status',
        data: { status: 'PROCESSING', progress: 0, processedCount: 0, totalCount: 1000, result: null }
      }));

      component.process();

      expect(studentServiceMock.processExcelToCsv).toHaveBeenCalledWith(mockFile);
      expect(component.isProcessing).toBe(true);
    });

    it('should set error message on failure', () => {
      const mockFile = new File(['test'], 'test.xlsx');
      component.selectedFile = mockFile;

      studentServiceMock.processExcelToCsv.mockReturnValue(of({
        success: false,
        message: 'Processing failed',
        data: null
      }));

      component.process();

      expect(component.errorMessage).toBe('Processing failed');
      expect(component.isProcessing).toBe(false);
    });

    it('should set error message on HTTP error', () => {
      const mockFile = new File(['test'], 'test.xlsx');
      component.selectedFile = mockFile;

      studentServiceMock.processExcelToCsv.mockReturnValue(throwError(() => new Error('Network error')));

      component.process();

      expect(component.errorMessage).toContain('Failed to start processing');
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
