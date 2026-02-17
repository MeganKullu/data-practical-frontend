import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ReportComponent } from './report.component';
import { StudentService } from '../../services/student.service';

describe('ReportComponent', () => {
  let component: ReportComponent;
  let fixture: ComponentFixture<ReportComponent>;
  let studentServiceMock: any;

  const mockStudentsResponse = {
    success: true,
    message: 'Report data retrieved',
    data: {
      content: [
        { studentId: 1, firstName: 'John', lastName: 'Doe', studentClass: 'Class1', score: 85, dob: '2000-01-01' },
        { studentId: 2, firstName: 'Jane', lastName: 'Smith', studentClass: 'Class2', score: 90, dob: '2001-02-15' }
      ],
      number: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true
    }
  };

  beforeEach(async () => {
    studentServiceMock = {
      getStudents: vi.fn(),
      exportToCsv: vi.fn(),
      exportToExcel: vi.fn(),
      exportToPdf: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReportComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not have searched initially', () => {
    expect(component.hasSearched).toBe(false);
  });

  it('should have empty students array initially', () => {
    expect(component.students).toEqual([]);
  });

  it('should not be loading initially', () => {
    expect(component.loading).toBe(false);
  });

  describe('search()', () => {
    it('should reset currentPage and call loadStudents', () => {
      studentServiceMock.getStudents.mockReturnValue(of(mockStudentsResponse));
      component.currentPage = 5;

      component.search();

      expect(component.currentPage).toBe(0);
      expect(studentServiceMock.getStudents).toHaveBeenCalled();
    });

    it('should set hasSearched to true', () => {
      studentServiceMock.getStudents.mockReturnValue(of(mockStudentsResponse));

      component.search();

      expect(component.hasSearched).toBe(true);
    });

    it('should populate students array on success', () => {
      studentServiceMock.getStudents.mockReturnValue(of(mockStudentsResponse));

      component.search();

      expect(component.students.length).toBe(2);
      expect(component.students[0].firstName).toBe('John');
    });
  });

  describe('clearSearch()', () => {
    it('should reset all filter and state values', () => {
      component.searchId = 123;
      component.selectedClass = 'Class1';
      component.hasSearched = true;
      component.students = mockStudentsResponse.data.content as any;
      component.errorMessage = 'Some error';

      component.clearSearch();

      expect(component.searchId).toBeUndefined();
      expect(component.selectedClass).toBeUndefined();
      expect(component.hasSearched).toBe(false);
      expect(component.students).toEqual([]);
      expect(component.errorMessage).toBe('');
    });
  });

  describe('goToPage()', () => {
    beforeEach(() => {
      component.totalPages = 5;
      studentServiceMock.getStudents.mockReturnValue(of(mockStudentsResponse));
    });

    it('should change page and load students for valid page', () => {
      component.goToPage(2);

      expect(component.currentPage).toBe(2);
      expect(studentServiceMock.getStudents).toHaveBeenCalled();
    });

    it('should not change page for invalid page (negative)', () => {
      component.currentPage = 0;
      component.goToPage(-1);

      expect(component.currentPage).toBe(0);
    });

    it('should not change page for invalid page (beyond total)', () => {
      component.currentPage = 2;
      component.goToPage(10);

      expect(component.currentPage).toBe(2);
    });
  });

  describe('loadStudents()', () => {
    it('should set loading to false after fetching', () => {
      studentServiceMock.getStudents.mockReturnValue(of(mockStudentsResponse));

      component.search();

      expect(component.loading).toBe(false);
    });

    it('should set error message on API failure', () => {
      studentServiceMock.getStudents.mockReturnValue(of({
        success: false,
        message: 'Database error',
        data: null
      }));

      component.search();

      expect(component.errorMessage).toBe('Database error');
    });

    it('should set error message on HTTP error', () => {
      studentServiceMock.getStudents.mockReturnValue(throwError(() => ({ message: 'Network error' })));

      component.search();

      expect(component.errorMessage).toContain('Failed to load students');
    });
  });

  describe('exportCsv()', () => {
    it('should call exportToCsv and set success message', () => {
      const mockExportResponse = {
        success: true,
        message: 'Export successful',
        data: { data: 'dGVzdA==', fileName: 'report.csv', contentType: 'text/csv' }
      };
      studentServiceMock.exportToCsv.mockReturnValue(of(mockExportResponse));

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      component.exportCsv();

      expect(studentServiceMock.exportToCsv).toHaveBeenCalled();
      expect(component.exportMessage).toContain('CSV exported successfully');
    });

    it('should set error message on export failure', () => {
      studentServiceMock.exportToCsv.mockReturnValue(of({
        success: false,
        message: 'Export failed',
        data: null
      }));

      component.exportCsv();

      expect(component.errorMessage).toBe('Export failed');
      expect(component.exporting).toBe(false);
    });
  });

  describe('exportExcel()', () => {
    it('should call exportToExcel and set success message', () => {
      const mockExportResponse = {
        success: true,
        message: 'Export successful',
        data: { data: 'dGVzdA==', fileName: 'report.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      };
      studentServiceMock.exportToExcel.mockReturnValue(of(mockExportResponse));

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      component.exportExcel();

      expect(studentServiceMock.exportToExcel).toHaveBeenCalled();
      expect(component.exportMessage).toContain('EXCEL exported successfully');
    });
  });

  describe('exportPdf()', () => {
    it('should call exportToPdf and set success message', () => {
      const mockExportResponse = {
        success: true,
        message: 'Export successful',
        data: { data: 'dGVzdA==', fileName: 'report.pdf', contentType: 'application/pdf' }
      };
      studentServiceMock.exportToPdf.mockReturnValue(of(mockExportResponse));

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      component.exportPdf();

      expect(studentServiceMock.exportToPdf).toHaveBeenCalled();
      expect(component.exportMessage).toContain('PDF exported successfully');
    });
  });

  describe('export error handling', () => {
    it('should set error message on export HTTP error', () => {
      studentServiceMock.exportToCsv.mockReturnValue(throwError(() => ({ message: 'Server error' })));

      component.exportCsv();

      expect(component.errorMessage).toContain('Export failed');
      expect(component.exporting).toBe(false);
    });
  });
});
