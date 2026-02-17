import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { JobInfo } from '../../models';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h2>Upload CSV to Database</h2>
      <p>Upload a CSV file to save records to the database. Score will be increased by 5.</p>

      <div class="file-input-wrapper">
        <label for="csvFile">Select CSV File (.csv)</label>
        <input
          type="file"
          id="csvFile"
          accept=".csv"
          (change)="onFileSelected($event)"
          [disabled]="isProcessing"
        />
      </div>

      @if (selectedFile) {
        <p class="file-info">Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</p>
      }

      <button
        class="btn btn-primary"
        (click)="upload()"
        [disabled]="!selectedFile || isProcessing"
      >
        {{ isProcessing ? 'Uploading...' : 'Upload to Database' }}
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
          <strong>Done!</strong> Records saved to database successfully.
          <br/>
          <small>{{ jobInfo?.result }}</small>
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
export class UploadComponent {
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

  upload() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.jobInfo = null;
    this.errorMessage = '';

    this.studentService.uploadCsvToDatabase(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.startPolling(response.data.jobId);
        } else {
          this.errorMessage = response.message;
          this.isProcessing = false;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to start upload: ' + (err.message || 'Unknown error');
        this.isProcessing = false;
      }
    });
  }

  private startPolling(jobId: string) {
    console.log('[Upload] Starting polling for jobId:', jobId);

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
    console.log('[Upload] Polling status for jobId:', jobId);

    this.studentService.getJobStatus(jobId).subscribe({
      next: (response) => {
        console.log('[Upload] Status response:', response);

        if (response.success) {
          this.jobInfo = response.data;
          console.log('[Upload] Progress:', this.jobInfo.progress, '%');
          console.log('[Upload] Processed:', this.jobInfo.processedCount, '/', this.jobInfo.totalCount);

          if (this.jobInfo.status === 'COMPLETED' || this.jobInfo.status === 'FAILED') {
            console.log('[Upload] Job finished with status:', this.jobInfo.status);
            this.stopPolling();
            this.isProcessing = false;
          }

          this.cdr.detectChanges();
        } else {
          console.warn('[Upload] Response not successful:', response);
        }
      },
      error: (err) => {
        console.error('[Upload] Polling error:', err);
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
