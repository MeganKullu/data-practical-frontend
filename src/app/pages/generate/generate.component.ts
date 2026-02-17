import { Component, inject, ChangeDetectorRef } from '@angular/core';
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

      <!-- Progress section -->
      @if (isProcessing && jobInfo) {
        <div class="progress-section">
          <div class="progress-bar">
            <div class="fill" [style.width.%]="jobInfo.progress"></div>
          </div>
          <p>{{ jobInfo.progress }}% - {{ jobInfo.processedCount | number }} / {{ jobInfo.totalCount | number }} records</p>
        </div>
      }

      <!-- Success message -->
      @if (jobInfo?.status === 'COMPLETED') {
        <div class="status success">
          <strong>Done!</strong> Excel file generated successfully.
          <br/>
          <small>Location: {{ jobInfo?.result }}</small>
        </div>
      }

      <!-- Error message -->
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
export class GenerateComponent {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  recordCount = 1000000;
  isProcessing = false;
  jobInfo: JobInfo | null = null;
  errorMessage = '';

  private pollingInterval: any;

  generate() {
    this.isProcessing = true;
    this.jobInfo = null;
    this.errorMessage = '';

    console.log('Starting generation with count:', this.recordCount);

    this.studentService.generateExcel(this.recordCount).subscribe({
      next: (response) => {
        console.log('Generate response:', response);

        if (response.success) {
          const jobId = response.data.jobId;
          console.log('Job started with ID:', jobId);
          this.startPolling(jobId);
        } else {
          console.warn('Generate failed:', response.message);
          this.errorMessage = response.message;
          this.isProcessing = false;
        }
      },
      error: (err) => {
        console.error('Generate error:', err);
        this.errorMessage = 'Failed to start generation: ' + (err.message || 'Unknown error');
        this.isProcessing = false;
      }
    });
  }

  private startPolling(jobId: string) {
    console.log('Starting polling for jobId:', jobId);

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
    console.log('Polling status for jobId:', jobId);

    this.studentService.getJobStatus(jobId).subscribe({
      next: (response) => {
        console.log('Status response:', response);
        console.log('Job info:', response.data);

        if (response.success) {
          this.jobInfo = response.data;
          console.log('Progress:', this.jobInfo.progress, '%');
          console.log('Processed:', this.jobInfo.processedCount, '/', this.jobInfo.totalCount);
          console.log('isProcessing:', this.isProcessing, 'jobInfo:', this.jobInfo);

          if (this.jobInfo.status === 'COMPLETED' || this.jobInfo.status === 'FAILED') {
            console.log('Job finished with status:', this.jobInfo.status);
            this.stopPolling();
            this.isProcessing = false;
          }

          // Force Angular to detect changes
          this.cdr.detectChanges();
          console.log('Change detection triggered');
        } else {
          console.warn('Response not successful:', response);
        }
      },
      error: (err) => {
        console.error('Polling error:', err);
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
