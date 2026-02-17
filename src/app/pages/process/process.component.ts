import { Component, inject, ChangeDetectorRef } from '@angular/core';
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

      @if (isProcessing && jobInfo) {
        <div class="progress-section">
          <div class="progress-bar">
            <div class="fill" [style.width.%]="jobInfo.progress"></div>
          </div>
          <p>{{ jobInfo.progress }}% - {{ jobInfo.processedCount | number }} / {{ jobInfo.totalCount | number }} records</p>
        </div>
      }

      @if (jobInfo?.status === 'COMPLETED') {
        <div class="status success">
          <strong>Done!</strong> CSV file created successfully.
          <br/>
          <small>Location: {{ jobInfo?.result }}</small>
        </div>
      }

      @if (jobInfo?.status === 'FAILED') {
        <div class="status error">
          <strong>Error:</strong> {{ jobInfo?.result }}
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
export class ProcessComponent {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  selectedFile: File | null = null;
  isProcessing = false;
  jobInfo: JobInfo | null = null;
  errorMessage = '';

  private pollingInterval: any;

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

    this.studentService.processExcelToCsv(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.startPolling(response.data.jobId);
        } else {
          this.errorMessage = response.message;
          this.isProcessing = false;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to start processing: ' + (err.message || 'Unknown error');
        this.isProcessing = false;
      }
    });
  }

  private startPolling(jobId: string) {
    console.log('[Process] Starting polling for jobId:', jobId);

    // Poll immediately first
    this.pollStatus(jobId);

    // Poll again after 2 seconds to catch fast jobs
    setTimeout(() => {
      if (this.isProcessing) {
        this.pollStatus(jobId);
      }
    }, 2000);

    // Then poll every 10 seconds
    this.pollingInterval = setInterval(() => {
      this.pollStatus(jobId);
    }, 10000);
  }

  private pollStatus(jobId: string) {
    console.log('[Process] Polling status for jobId:', jobId);

    this.studentService.getJobStatus(jobId).subscribe({
      next: (response) => {
        console.log('[Process] Status response:', response);

        if (response.success) {
          this.jobInfo = response.data;
          console.log('[Process] Progress:', this.jobInfo.progress, '%');
          console.log('[Process] Processed:', this.jobInfo.processedCount, '/', this.jobInfo.totalCount);

          if (this.jobInfo.status === 'COMPLETED' || this.jobInfo.status === 'FAILED') {
            console.log('[Process] Job finished with status:', this.jobInfo.status);
            this.stopPolling();
            this.isProcessing = false;
          }

          this.cdr.detectChanges();
        } else {
          console.warn('[Process] Response not successful:', response);
        }
      },
      error: (err) => {
        console.error('[Process] Polling error:', err);
        this.errorMessage = 'Failed to check status: ' + err.message;
        this.stopPolling();
        this.isProcessing = false;
        this.cdr.detectChanges();
      }
    });
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
