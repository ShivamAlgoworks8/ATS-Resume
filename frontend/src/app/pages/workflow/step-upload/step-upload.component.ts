import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResumeApiService } from '../../../services/resume.service';
import { WorkflowStateService } from '../../../services/workflow-state.service';
import { ToastService } from '../../../services/toast.service';
import { ResumeRecord } from '../../../models/resume.models';

@Component({
  selector: 'app-step-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-upload.component.html',
})
export class StepUploadComponent implements OnInit {
  readonly resumeApi = inject(ResumeApiService);
  readonly state = inject(WorkflowStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly uploading = signal(false);
  readonly draggingResume = signal(false);
  readonly draggingJd = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly jdValidationError = signal<string | null>(null);
  readonly showExtractedPreview = signal(false);

  readonly jdCharCount = computed(() => this.state.jobDescription().length);
  readonly canAnalyze = computed(
    () =>
      this.state.hasUploadedResume() &&
      this.state.jobDescription().trim().length >= 20 &&
      !this.uploading() &&
      !this.state.analyzing()
  );

  ngOnInit(): void {
    this.resumeApi.loadResumes();
  }

  onResumeDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggingResume.set(true);
  }

  onResumeDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.draggingResume.set(false);
  }

  onResumeDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingResume.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processResumeFile(file);
    }
  }

  onResumeFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processResumeFile(file);
      input.value = '';
    }
  }

  selectExistingResume(record: ResumeRecord): void {
    this.uploadError.set(null);
    this.state.setActiveResume(record);
    this.toast.show(`Selected "${record.originalFileName || record.fileName}"`);
  }

  removeResume(): void {
    this.state.clearActiveResume();
    this.uploadError.set(null);
    this.showExtractedPreview.set(false);
  }

  updateJobTitle(event: Event): void {
    this.state.jobTitle.set((event.target as HTMLInputElement).value);
  }

  updateCompanyName(event: Event): void {
    this.state.companyName.set((event.target as HTMLInputElement).value);
  }

  updateJdText(event: Event): void {
    this.jdValidationError.set(null);
    this.state.jobDescription.set((event.target as HTMLTextAreaElement).value.slice(0, 5000));
  }

  onJdFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processJdFile(file);
      input.value = '';
    }
  }

  onJdDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggingJd.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processJdFile(file);
    }
  }

  startAnalysis(): void {
    if (!this.state.hasUploadedResume()) {
      this.uploadError.set('Please upload a PDF or DOCX resume (or select one from your library) before running analysis.');
      this.toast.show('Please upload or select a resume first.');
      return;
    }
    if (this.state.jobDescription().trim().length < 20) {
      this.jdValidationError.set('Please enter or upload at least 20 characters of Job Description text.');
      this.toast.show('Please provide a valid Job Description (minimum 20 characters).');
      return;
    }
    this.uploadError.set(null);
    this.jdValidationError.set(null);
    this.state.runAnalysis(() => {
      this.router.navigate(['/analysis-results']);
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    const kb = Math.round(bytes / 1024);
    if (kb < 1024) return `${kb} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private processResumeFile(file: File): void {
    this.uploadError.set(null);
    if (file.size === 0) {
      this.uploadError.set('The selected file is empty (0 bytes). Please upload a valid PDF or DOCX resume.');
      this.toast.show('File is empty.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      this.uploadError.set('File exceeds the 50 MB maximum size limit.');
      this.toast.show('File exceeds 50 MB limit.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext !== 'pdf' && ext !== 'docx') {
      this.uploadError.set('Only PDF (.pdf) and Word (.docx) files are supported.');
      this.toast.show('Only PDF and DOCX files are allowed.');
      return;
    }

    this.uploading.set(true);
    this.resumeApi.uploadResume(file).subscribe({
      next: (savedRecord) => {
        this.uploading.set(false);
        this.state.setActiveResume(savedRecord);
        this.toast.show(`Uploaded "${savedRecord.originalFileName}" successfully.`);
      },
      error: (err) => {
        this.uploading.set(false);
        const backendMsg = err?.error?.message;
        if (backendMsg) {
          this.uploadError.set(backendMsg);
          this.toast.show(backendMsg);
        } else {
          this.uploadError.set(
            'Could not reach backend upload API (POST /api/v1/resumes). Ensure Spring Boot is running on port 8080.'
          );
          this.toast.show('Backend upload failed.');
        }
      },
    });
  }

  private processJdFile(file: File): void {
    this.jdValidationError.set(null);
    if (file.size === 0) {
      this.jdValidationError.set('Selected Job Description file is empty (0 bytes).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      this.jdValidationError.set('Job Description file exceeds the 50 MB limit.');
      return;
    }
    this.state.jdFileName.set(file.name);
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.txt')) {
      file.text().then((text) => {
        this.state.jobDescription.set(text.slice(0, 5000));
        this.state.jdInputMode.set('paste');
        this.toast.show(`Loaded job description text from ${file.name}.`);
      });
    } else if (lower.endsWith('.pdf') || lower.endsWith('.docx')) {
      this.resumeApi.extractText(file).subscribe({
        next: ({ text }) => {
          this.state.jobDescription.set((text || '').trim().slice(0, 5000));
          this.state.jdInputMode.set('paste');
          this.toast.show(`Extracted text from ${file.name}.`);
        },
        error: (err) => {
          this.jdValidationError.set(err?.error?.message || `Could not read "${file.name}". Paste the text instead.`);
        },
      });
    } else {
      this.jdValidationError.set('Supported job description files: .txt, .pdf, .docx');
    }
  }
}
