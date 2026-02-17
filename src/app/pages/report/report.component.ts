import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student, StudentClass, STUDENT_CLASSES, Page } from '../../models';

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
          <button class="btn btn-primary" (click)="search()">Search</button>
          @if (searchId) {
            <button class="btn btn-secondary" (click)="clearSearch()">Clear</button>
          }
        </div>

        <div class="filter-group">
          <label for="classFilter">Filter by Class</label>
          <select id="classFilter" [(ngModel)]="selectedClass" (change)="search()">
            <option [ngValue]="undefined">All Classes</option>
            @for (cls of classes; track cls) {
              <option [ngValue]="cls">{{ cls }}</option>
            }
          </select>
        </div>

        <div class="export-group">
          <label>Export</label>
          <div class="export-buttons">
            <button class="btn btn-secondary" (click)="exportCsv()" [disabled]="exporting">CSV</button>
            <button class="btn btn-secondary" (click)="exportExcel()" [disabled]="exporting">Excel</button>
            <button class="btn btn-secondary" (click)="exportPdf()" [disabled]="exporting">PDF</button>
          </div>
        </div>
      </div>

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
      @if (!loading && students.length > 0) {
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

      @if (!loading && students.length === 0) {
        <div class="status info">No students found.</div>
      }
    </div>
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      flex-wrap: wrap;
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
    }
    .filter-group .btn {
      margin-top: 4px;
    }
    .export-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .export-buttons {
      display: flex;
      gap: 8px;
    }
    .export-buttons .btn {
      padding: 8px 12px;
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
export class ReportComponent implements OnInit {
  private studentService = inject(StudentService);

  classes = STUDENT_CLASSES;
  students: Student[] = [];
  loading = false;
  errorMessage = '';
  exportMessage = '';
  exporting = false;

  // Filters
  searchId: number | undefined;
  selectedClass: StudentClass | undefined;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;

  ngOnInit() {
    this.loadStudents();
  }

  search() {
    this.currentPage = 0;
    this.loadStudents();
  }

  clearSearch() {
    this.searchId = undefined;
    this.currentPage = 0;
    this.loadStudents();
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadStudents();
    }
  }

  loadStudents() {
    this.loading = true;
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
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load students: ' + (err.message || 'Unknown error');
        this.loading = false;
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
      },
      error: (err) => {
        this.errorMessage = 'Export failed: ' + (err.message || 'Unknown error');
        this.exporting = false;
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
