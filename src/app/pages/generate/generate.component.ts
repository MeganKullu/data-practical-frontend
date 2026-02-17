import { Component, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { JobInfo } from '../../models';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h2>Generate Excel Data</h2>
      <p>Generate student records and save to Excel file.</p>

      <div class="form-group">
        <label for="recordCount">Number of Records</label>
        <input
          type="number"
          id="recordCount"
          [(ngModel)]="recordCount"
          min="1"
          max="2000000"
          [disabled]="isProcessing"
        />
      </div>

      <button
        class="btn btn-primary"
        (click)="generate()"
        [disabled]="isProcessing || recordCount < 1"
      >
        {{ isProcessing ? 'Generating...' : 'Generate Excel' }}
      </button>

      <!-- Progress section - show immediately when processing starts -->
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

      <!-- Success message -->
      @if (jobInfo?.status === 'COMPLETED') {
        <div class="status success">
          <strong>Done!</strong> Excel file generated successfully.
          <br/>
          <small>Location: {{ jobInfo?.result }}</small>
          <br/>
          <small>Completed in {{ elapsedTime }}</small>
        </div>
      }

      <!-- Error message -->
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
export class GenerateComponent implements OnDestroy {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  recordCount = 1000000;
  isProcessing = false;
  jobInfo: JobInfo | null = null;
  errorMessage = '';
  elapsedTime = '';

  private pollingInterval: any;
  private startTime: number = 0;

  generate() {
    this.isProcessing = true;
    this.jobInfo = null;
    this.errorMessage = '';
    this.elapsedTime = '';
    this.startTime = Date.now();
    this.cdr.detectChanges();

    this.studentService.generateExcel(this.recordCount).subscribe({
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
        this.errorMessage = 'Failed to start generation: ' + (err.message || 'Unknown error');
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

          if (this.jobInfo.status === 'COMPLETED') {
            this.elapsedTime = this.formatElapsedTime(Date.now() - this.startTime);
            this.stopPolling();
            this.isProcessing = false;
            // Auto-download the file
            this.studentService.downloadFile(jobId);
          } else if (this.jobInfo.status === 'FAILED') {
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
