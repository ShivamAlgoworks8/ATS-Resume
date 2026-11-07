import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ResumeTemplateId,
  WorkflowStateService,
} from '../../../services/workflow-state.service';
import { ResumeApiService } from '../../../services/resume.service';
import {
  generateLatexDocument,
  PREDEFINED_LATEX_RESUME_TEMPLATE,
} from '../../../templates/latex-resume.template';

export interface TemplateCatalogCard {
  id: ResumeTemplateId;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
}

@Component({
  selector: 'app-step-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-preview.component.html',
})
export class StepPreviewComponent {
  readonly state = inject(WorkflowStateService);
  private readonly resumeApi = inject(ResumeApiService);
  private readonly router = inject(Router);

  readonly activeViewMode = signal<'PAPER_PREVIEW' | 'LATEX_SOURCE' | 'TEMPLATE_STRUCTURE'>(
    'PAPER_PREVIEW'
  );
  readonly copyStatusMessage = signal<string | null>(null);
  readonly backendPdfStatus = signal<string | null>(null);
  readonly isRequestingBackendPdf = signal<boolean>(false);

  readonly templateCatalog: TemplateCatalogCard[] = [
    {
      id: 'classic-ats',
      name: 'Classic ATS',
      subtitle: 'Single-Column Academic & Engineering Serif',
      badge: '99% ATS Parse Rate',
      description:
        'Traditional serif typography with full-width section rules, optimized for Workday, Greenhouse, and Lever.',
    },
    {
      id: 'modern-executive',
      name: 'Modern Executive',
      subtitle: 'Clean Sans-Serif Professional Layout',
      badge: 'Modern & Crisp',
      description:
        'Uses Inter sans-serif headings and balanced whitespace for product, engineering, and leadership roles.',
    },
    {
      id: 'compact-technical',
      name: 'Compact Technical',
      subtitle: 'High-Density Single-Page Layout',
      badge: 'One-Page Fit',
      description:
        'Tighter line height and compact margins designed to fit extensive technical experience onto a single page.',
    },
  ];

  readonly rawTemplateStructure = PREDEFINED_LATEX_RESUME_TEMPLATE;

  readonly compiledLatexSource = computed(() => {
    return generateLatexDocument(this.state.editableStructured());
  });

  selectAndUseTemplate(id: ResumeTemplateId): void {
    this.state.selectedTemplate.set(id);
    this.router.navigate(['/resume-generator']);
  }

  copyLatexToClipboard(): void {
    const code = this.compiledLatexSource();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copyStatusMessage.set('LaTeX source (.tex) copied to clipboard.');
        setTimeout(() => this.copyStatusMessage.set(null), 3500);
      });
    }
  }

  downloadTexFile(): void {
    const code = this.compiledLatexSource();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = (this.state.editableStructured().contact.fullName || 'Optimized_Resume')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `${cleanName}_ATS_Resume.tex`;
    link.click();
    URL.revokeObjectURL(url);
    this.copyStatusMessage.set(`Downloaded ${cleanName}_ATS_Resume.tex`);
    setTimeout(() => this.copyStatusMessage.set(null), 3500);
  }

  requestBackendPdfGeneration(): void {
    this.isRequestingBackendPdf.set(true);
    this.backendPdfStatus.set(null);

    const resumeId = this.state.activeResume()?.id || 'draft-resume';
    this.resumeApi
      .generatePdfOnBackend(resumeId, this.compiledLatexSource())
      .subscribe({
        next: (blob) => {
          this.isRequestingBackendPdf.set(false);
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const cleanName = (
            this.state.editableStructured().contact.fullName || 'Optimized_Resume'
          ).replace(/[^a-zA-Z0-9_-]/g, '_');
          link.href = url;
          link.download = `${cleanName}_ATS_Resume.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.backendPdfStatus.set('PDF compiled and downloaded from Spring Boot backend.');
        },
        error: () => {
          this.isRequestingBackendPdf.set(false);
          window.print();
        },
      });
  }

  printOrSaveBrowserPdf(): void {
    window.print();
  }

    returnToGenerator(): void {
      this.router.navigate(['/resume-generator']);
    }
  }
