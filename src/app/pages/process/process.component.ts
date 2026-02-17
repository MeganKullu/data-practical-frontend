import { Component, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { JobInfo } from '../../models';

@Component({
  selector: 'app-process',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h2>Process Excel to CSV</h2>
      <p>Upload an Excel file to convert it to CSV. Score will be increased by 10.</p>

      <div class="file-input-wrapper">
        <label for="excelFile">Select Excel File (.xlsx)</label>
        <input
          type="file"
          id="excelFile"
          accept=".xlsx,.xls"
          (change)="onFileSelected($event)"
          [disabled]="isProcessing"
        />
      </div>

      @if (selectedFile) {
        <p class="file-info">Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</p>
      }

      <button
        class="btn btn-primary"
        (click)="process()"
        [disabled]="!selectedFile || isProcessing"
      >
        {{ isProcessing ? 'Processing...' : 'Process to CSV' }}
      </button>

      @if (isProcessing) {
        <div class="progress-section">
          <div class="progress-bar">
            <div class="fill" [style.width.%]="jobInfo?.progress || 0"></div>
          </div>
          @if (jobInfo) {
            <p>{{ jobInfo.progress }}% - {{ jobInfo.processedCount | number }} / {{ jobInfo.totalCount | number }} records</p>
          } @else {
            <p>Starting...</p>
          }
        </div>
      }

      @if (jobInfo?.status === 'COMPLETED') {
        <div class="status success">
          <strong>Done!</strong> CSV file created successfully.
          <br/>
          <small>Location: {{ jobInfo?.result }}</small>
          <br/>
          <small>Completed in {{ elapsedTime }}</small>
        </div>
      }

      @if (jobInfo?.status === 'FAILED') {
        <div class="status error">
          <strong>Error:</strong> {{ jobInfo?.result }}
          <br/>
          <small>Failed after {{ elapsedTime }}</small>
        </div>
      }

      @if (errorMessage) {
        <div class="status error">{{ errorMessage }}</div>
      }
    </div>
  `,
  styles: [`
    .file-info {
      margin: 8px 0 16px;
      color: #666;
    }
    .progress-section {
      margin-top: 20px;
    }
    .progress-section p {
      text-align: center;
      margin-top: 8px;
      color: #666;
    }
  `]
})
export class ProcessComponent implements OnDestroy {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  selectedFile: File | null = null;
  isProcessing = false;
  jobInfo: JobInfo | null = null;
  errorMessage = '';
  elapsedTime = '';

  private pollingInterval: any;
  private startTime: number = 0;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.jobInfo = null;
      this.errorMessage = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  process() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.jobInfo = null;
    this.errorMessage = '';
    this.elapsedTime = '';
    this.startTime = Date.now();
    this.cdr.detectChanges();

    this.studentService.processExcelToCsv(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.startPolling(response.data.jobId);
        } else {
          this.errorMessage = response.message;
          this.isProcessing = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to start processing: ' + (err.message || 'Unknown error');
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  private startPolling(jobId: string) {
    this.pollStatus(jobId);

    setTimeout(() => {
      if (this.isProcessing) {
        this.pollStatus(jobId);
      }
    }, 2000);

    this.pollingInterval = setInterval(() => {
      this.pollStatus(jobId);
    }, 10000);
  }

  private pollStatus(jobId: string) {
    this.studentService.getJobStatus(jobId).subscribe({
      next: (response) => {
        if (response.success) {
          this.jobInfo = response.data;

          if (this.jobInfo.status === 'COMPLETED' || this.jobInfo.status === 'FAILED') {
            this.elapsedTime = this.formatElapsedTime(Date.now() - this.startTime);
            this.stopPolling();
            this.isProcessing = false;
          }

          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to check status: ' + err.message;
        this.elapsedTime = this.formatElapsedTime(Date.now() - this.startTime);
        this.stopPolling();
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
  }

  private formatElapsedTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else if (seconds > 0) {
      return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
    } else {
      return `${ms}ms`;
    }
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
