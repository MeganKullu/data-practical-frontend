import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student, StudentClass, STUDENT_CLASSES } from '../../models';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h2>Student Report</h2>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label for="searchId">Search by Student ID</label>
          <input
            type="number"
            id="searchId"
            [(ngModel)]="searchId"
            placeholder="Enter ID..."
            (keyup.enter)="search()"
          />
        </div>

        <div class="filter-group">
          <label for="classFilter">Filter by Class</label>
          <select id="classFilter" [(ngModel)]="selectedClass">
            <option [ngValue]="undefined">All Classes</option>
            @for (cls of classes; track cls) {
              <option [ngValue]="cls">{{ cls }}</option>
            }
          </select>
        </div>

        <div class="filter-group btn-group">
          <label>&nbsp;</label>
          <div class="btn-row">
            <button class="btn btn-primary" (click)="search()">Search</button>
            @if (hasSearched) {
              <button class="btn btn-secondary" (click)="clearSearch()">Clear</button>
            }
          </div>
        </div>

        <div class="export-group">
          <label>Export</label>
          <div class="export-buttons">
            <button
              class="btn btn-secondary"
              (click)="exportCsv()"
              [disabled]="exporting || !hasSearched"
            >
              {{ exportingType === 'csv' ? 'Generating...' : 'CSV' }}
            </button>
            <button
              class="btn btn-secondary"
              (click)="exportExcel()"
              [disabled]="exporting || !hasSearched"
            >
              {{ exportingType === 'excel' ? 'Generating...' : 'Excel' }}
            </button>
            <button
              class="btn btn-secondary"
              (click)="exportPdf()"
              [disabled]="exporting || !hasSearched"
            >
              {{ exportingType === 'pdf' ? 'Generating...' : 'PDF' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Initial state - before any search -->
      @if (!hasSearched && !loading) {
        <div class="status info">Use the filters above and click Search to find students.</div>
      }

      @if (loading) {
        <div class="status info">Loading...</div>
      }

      @if (errorMessage) {
        <div class="status error">{{ errorMessage }}</div>
      }

      @if (exportMessage) {
        <div class="status success">{{ exportMessage }}</div>
      }

      <!-- Data Table -->
      @if (!loading && hasSearched && students.length > 0) {
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Date of Birth</th>
              <th>Class</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            @for (student of students; track student.studentId) {
              <tr>
                <td>{{ student.studentId }}</td>
                <td>{{ student.firstName }}</td>
                <td>{{ student.lastName }}</td>
                <td>{{ student.dob }}</td>
                <td>{{ student.studentClass }}</td>
                <td>{{ student.score }}</td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination">
          <button
            class="btn btn-secondary"
            (click)="goToPage(0)"
            [disabled]="currentPage === 0"
          >First</button>
          <button
            class="btn btn-secondary"
            (click)="goToPage(currentPage - 1)"
            [disabled]="currentPage === 0"
          >Prev</button>

          <span class="page-info">
            Page {{ currentPage + 1 }} of {{ totalPages }} ({{ totalElements | number }} records)
          </span>

          <button
            class="btn btn-secondary"
            (click)="goToPage(currentPage + 1)"
            [disabled]="currentPage >= totalPages - 1"
          >Next</button>
          <button
            class="btn btn-secondary"
            (click)="goToPage(totalPages - 1)"
            [disabled]="currentPage >= totalPages - 1"
          >Last</button>
        </div>
      }

      @if (!loading && hasSearched && students.length === 0) {
        <div class="status info">No students found matching your criteria.</div>
      }
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-group input,
    .filter-group select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      height: 38px;
    }
    .btn-group .btn-row {
      display: flex;
      gap: 8px;
    }
    .export-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: auto;
    }
    .export-buttons {
      display: flex;
      gap: 8px;
    }
    .export-buttons .btn {
      padding: 8px 12px;
      min-width: 90px;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding: 16px 0;
    }
    .page-info {
      margin: 0 16px;
      color: #666;
    }
    .pagination .btn {
      padding: 6px 12px;
    }
  `]
})
export class ReportComponent {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  classes = STUDENT_CLASSES;
  students: Student[] = [];
  loading = false;
  hasSearched = false;
  errorMessage = '';
  exportMessage = '';
  exporting = false;
  exportingType: 'csv' | 'excel' | 'pdf' | null = null;

  // Filters
  searchId: number | undefined;
  selectedClass: StudentClass | undefined;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  search() {
    this.currentPage = 0;
    this.loadStudents();
  }

  clearSearch() {
    this.searchId = undefined;
    this.selectedClass = undefined;
    this.hasSearched = false;
    this.students = [];
    this.totalPages = 0;
    this.totalElements = 0;
    this.errorMessage = '';
    this.exportMessage = '';
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadStudents();
    }
  }

  loadStudents() {
    this.loading = true;
    this.hasSearched = true;
    this.errorMessage = '';
    this.exportMessage = '';

    this.studentService.getStudents(
      this.currentPage,
      this.pageSize,
      this.searchId,
      this.selectedClass
    ).subscribe({
      next: (response) => {
        if (response.success) {
          const page = response.data;
          this.students = page.content;
          this.totalPages = page.totalPages;
          this.totalElements = page.totalElements;
        } else {
          this.errorMessage = response.message;
          this.students = [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load students: ' + (err.error?.message || err.message || 'Unknown error');
        this.students = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  exportCsv() {
    this.export('csv');
  }

  exportExcel() {
    this.export('excel');
  }

  exportPdf() {
    this.export('pdf');
  }

  private export(type: 'csv' | 'excel' | 'pdf') {
    this.exporting = true;
    this.exportingType = type;
    this.exportMessage = '';
    this.errorMessage = '';

    const exportFn = type === 'csv'
      ? this.studentService.exportToCsv(this.searchId, this.selectedClass)
      : type === 'excel'
        ? this.studentService.exportToExcel(this.searchId, this.selectedClass)
        : this.studentService.exportToPdf(this.searchId, this.selectedClass);

    exportFn.subscribe({
      next: (response) => {
        if (response.success) {
          this.downloadFile(response.data.data, response.data.fileName, response.data.contentType);
          this.exportMessage = `${type.toUpperCase()} exported successfully!`;
        } else {
          this.errorMessage = response.message;
        }
        this.exporting = false;
        this.exportingType = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Export failed: ' + (err.error?.message || err.message || 'Unknown error');
        this.exporting = false;
        this.exportingType = null;
        this.cdr.detectChanges();
      }
    });
  }

  private downloadFile(base64Data: string, fileName: string, contentType: string) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
