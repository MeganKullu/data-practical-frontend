import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { GenerateComponent } from './generate.component';
import { StudentService } from '../../services/student.service';

describe('GenerateComponent', () => {
  let component: GenerateComponent;
  let fixture: ComponentFixture<GenerateComponent>;
  let studentServiceMock: any;

  beforeEach(async () => {
    studentServiceMock = {
      generateExcel: vi.fn(),
      getJobStatus: vi.fn(),
      downloadFile: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GenerateComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default record count of 1000000', () => {
    expect(component.recordCount).toBe(1000000);
  });

  it('should not be processing initially', () => {
    expect(component.isProcessing).toBe(false);
  });

  it('should have no job info initially', () => {
    expect(component.jobInfo).toBeNull();
  });

  describe('generate()', () => {
    it('should set isProcessing to true when called', () => {
      studentServiceMock.generateExcel.mockReturnValue(of({
        success: true,
        message: 'Job started',
        data: { jobId: 'test-123' }
      }));
      studentServiceMock.getJobStatus.mockReturnValue(of({
        success: true,
        message: 'Status',
        data: { status: 'PROCESSING', progress: 0, processedCount: 0, totalCount: 1000, result: null }
      }));

      component.generate();

      expect(component.isProcessing).toBe(true);
    });

    it('should call studentService.generateExcel with recordCount', () => {
      studentServiceMock.generateExcel.mockReturnValue(of({
        success: true,
        message: 'Job started',
        data: { jobId: 'test-123' }
      }));
      studentServiceMock.getJobStatus.mockReturnValue(of({
        success: true,
        message: 'Status',
        data: { status: 'PROCESSING', progress: 0, processedCount: 0, totalCount: 1000, result: null }
      }));

      component.recordCount = 5000;
      component.generate();

      expect(studentServiceMock.generateExcel).toHaveBeenCalledWith(5000);
    });

    it('should set error message on failure response', () => {
      studentServiceMock.generateExcel.mockReturnValue(of({
        success: false,
        message: 'Generation failed',
        data: null
      }));

      component.generate();

      expect(component.errorMessage).toBe('Generation failed');
      expect(component.isProcessing).toBe(false);
    });

    it('should set error message on HTTP error', () => {
      studentServiceMock.generateExcel.mockReturnValue(throwError(() => new Error('Network error')));

      component.generate();

      expect(component.errorMessage).toContain('Failed to start generation');
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('formatElapsedTime()', () => {
    it('should format milliseconds correctly', () => {
      expect((component as any).formatElapsedTime(500)).toBe('500ms');
    });

    it('should format seconds correctly', () => {
      expect((component as any).formatElapsedTime(3500)).toBe('3.5s');
    });

    it('should format minutes correctly', () => {
      expect((component as any).formatElapsedTime(125000)).toBe('2m 5s');
    });

    it('should format hours correctly', () => {
      expect((component as any).formatElapsedTime(3725000)).toBe('1h 2m 5s');
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
