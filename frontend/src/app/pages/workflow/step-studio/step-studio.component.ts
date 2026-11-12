import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ResumeTemplateId,
  WorkflowStateService,
} from '../../../services/workflow-state.service';
import { ResumeApiService } from '../../../services/resume.service';
import {
  AchievementItem,
  ContactInfo,
  EducationItem,
  ProjectItem,
  SkillCategoryGroup,
  StructuredResume,
  WorkExperienceItem,
} from '../../../models/resume.models';
import { generateLatexDocument } from '../../../templates/latex-resume.template';

export interface TemplateOption {
  id: ResumeTemplateId;
  name: string;
  tag: string;
}

@Component({
  selector: 'app-step-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './step-studio.component.html',
})
export class StepStudioComponent {
  readonly state = inject(WorkflowStateService);
  private readonly resumeApi = inject(ResumeApiService);
  private readonly router = inject(Router);

  readonly activeSectionTab = signal<
    'ALL' | 'CONTACT' | 'SUMMARY' | 'SKILLS' | 'EXPERIENCE' | 'PROJECTS' | 'EDUCATION'
  >('ALL');

  readonly templates: TemplateOption[] = [
    { id: 'classic-ats', name: 'Classic ATS', tag: 'Standard Serif' },
    { id: 'modern-executive', name: 'Modern Executive', tag: 'Clean Sans' },
    { id: 'compact-technical', name: 'Compact Technical', tag: 'High Density' },
  ];

  readonly newSkillInputs = signal<Record<string, string>>({});
  readonly newSkillCategoryName = signal<string>('');

  readonly editingSkillKey = signal<string | null>(null);
  readonly editingSkillValue = signal<string>('');

  readonly studioFeedbackBanner = signal<string | null>(null);
  readonly isExportingPdf = signal<boolean>(false);

  selectTemplate(templateId: ResumeTemplateId): void {
    this.state.selectedTemplate.set(templateId);
  }

  private patchEditable(mutator: (draft: StructuredResume) => void): void {
    const copy: StructuredResume = JSON.parse(
      JSON.stringify(this.state.editableStructured())
    );
    mutator(copy);
    this.state.editableStructured.set(copy);
  }

  updateContactField(field: keyof ContactInfo, value: string): void {
    this.patchEditable((draft) => {
      draft.contact[field] = value;
    });
  }

  updateSummaryText(value: string): void {
    this.patchEditable((draft) => {
      draft.professionalSummary = value;
    });
  }

  getNewSkillInput(catId: string): string {
    return this.newSkillInputs()[catId] || '';
  }

  setNewSkillInput(catId: string, val: string): void {
    this.newSkillInputs.update((prev) => ({ ...prev, [catId]: val }));
  }

  addSkillToCategory(catId: string): void {
    const raw = this.getNewSkillInput(catId).trim();
    if (!raw) return;

    this.patchEditable((draft) => {
      const group = draft.skillCategories.find((g) => g.id === catId);
      if (!group) return;

      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const part of parts) {
        const exists = group.skills.some((s) => s.toLowerCase() === part.toLowerCase());
        if (!exists) {
          group.skills.push(part);
        }
      }
    });

    this.setNewSkillInput(catId, '');
  }

  removeSkillFromCategory(catId: string, skillIndex: number): void {
    this.patchEditable((draft) => {
      const group = draft.skillCategories.find((g) => g.id === catId);
      if (group) {
        group.skills.splice(skillIndex, 1);
      }
    });
  }

  startEditSkill(catId: string, skillIndex: number, currentVal: string): void {
    this.editingSkillKey.set(`${catId}:${skillIndex}`);
    this.editingSkillValue.set(currentVal);
  }

  saveEditedSkill(catId: string, skillIndex: number): void {
    const trimmed = this.editingSkillValue().trim();
    if (trimmed) {
      this.patchEditable((draft) => {
        const group = draft.skillCategories.find((g) => g.id === catId);
        if (group) {
          group.skills[skillIndex] = trimmed;
        }
      });
    }
    this.editingSkillKey.set(null);
  }

  cancelEditSkill(): void {
    this.editingSkillKey.set(null);
  }

  updateCategoryTitle(catId: string, newTitle: string): void {
    this.patchEditable((draft) => {
      const group: SkillCategoryGroup | undefined = draft.skillCategories.find(
        (g) => g.id === catId
      );
      if (group) {
        group.categoryName = newTitle;
      }
    });
  }

  addSkillCategory(): void {
    const name = this.newSkillCategoryName().trim();
    if (!name) return;
    this.patchEditable((draft) => {
      draft.skillCategories.push({
        id: 'cat-' + Date.now(),
        categoryName: name,
        skills: [],
      });
    });
    this.newSkillCategoryName.set('');
  }

  removeSkillCategory(catId: string): void {
    this.patchEditable((draft) => {
      draft.skillCategories = draft.skillCategories.filter((g) => g.id !== catId);
    });
  }

  updateExperienceField(
    expId: string,
    field: keyof WorkExperienceItem,
    value: string | boolean
  ): void {
    this.patchEditable((draft) => {
      const item = draft.experience.find((e) => e.id === expId);
      if (item) {
        (item as unknown as Record<string, unknown>)[field] = value;
      }
    });
  }

  updateExperienceBullet(expId: string, bulletIdx: number, value: string): void {
    this.patchEditable((draft) => {
      const item = draft.experience.find((e) => e.id === expId);
      if (item) {
        item.bullets[bulletIdx] = value;
      }
    });
  }

  addExperienceBullet(expId: string): void {
    this.patchEditable((draft) => {
      const item = draft.experience.find((e) => e.id === expId);
      if (item) {
        item.bullets.push('');
      }
    });
  }

  removeExperienceBullet(expId: string, bulletIdx: number): void {
    this.patchEditable((draft) => {
      const item = draft.experience.find((e) => e.id === expId);
      if (item && item.bullets.length > 1) {
        item.bullets.splice(bulletIdx, 1);
      }
    });
  }

  addExperienceEntry(): void {
    this.patchEditable((draft) => {
      draft.experience.unshift({
        id: 'exp-' + Date.now(),
        jobTitle: '',
        company: '',
        location: '',
        startDate: '',
        endDate: 'Present',
        bullets: [''],
      });
    });
  }

  removeExperienceEntry(expId: string): void {
    this.patchEditable((draft) => {
      draft.experience = draft.experience.filter((e) => e.id !== expId);
    });
  }

  updateProjectField(
    projId: string,
    field: keyof ProjectItem,
    value: string | boolean
  ): void {
    this.patchEditable((draft) => {
      const item = draft.projects.find((p) => p.id === projId);
      if (item) {
        (item as unknown as Record<string, unknown>)[field] = value;
      }
    });
  }

  updateProjectBullet(projId: string, bulletIdx: number, value: string): void {
    this.patchEditable((draft) => {
      const item = draft.projects.find((p) => p.id === projId);
      if (item) {
        item.bullets[bulletIdx] = value;
      }
    });
  }

  addProjectBullet(projId: string): void {
    this.patchEditable((draft) => {
      const item = draft.projects.find((p) => p.id === projId);
      if (item) {
        item.bullets.push('');
      }
    });
  }

  removeProjectBullet(projId: string, bulletIdx: number): void {
    this.patchEditable((draft) => {
      const item = draft.projects.find((p) => p.id === projId);
      if (item && item.bullets.length > 1) {
        item.bullets.splice(bulletIdx, 1);
      }
    });
  }

  addProjectEntry(): void {
    this.patchEditable((draft) => {
      draft.projects.push({
        id: 'proj-' + Date.now(),
        title: '',
        technologies: '',
        link: '',
        startDate: '',
        endDate: '',
        bullets: [''],
      });
    });
  }

  removeProjectEntry(projId: string): void {
    this.patchEditable((draft) => {
      draft.projects = draft.projects.filter((p) => p.id !== projId);
    });
  }

  updateEducationField(
    eduId: string,
    field: keyof EducationItem,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.education.find((e) => e.id === eduId);
      if (item) {
        (item as unknown as Record<string, unknown>)[field] = value;
      }
    });
  }

  addEducationEntry(): void {
    this.patchEditable((draft) => {
      draft.education.push({
        id: 'edu-' + Date.now(),
        degree: '',
        fieldOfStudy: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        gradeOrHonors: '',
      });
    });
  }

  removeEducationEntry(eduId: string): void {
    this.patchEditable((draft) => {
      draft.education = draft.education.filter((e) => e.id !== eduId);
    });
  }

  updateAchievementField(
    achId: string,
    field: keyof AchievementItem,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.achievements.find((a) => a.id === achId);
      if (item) {
        (item as unknown as Record<string, unknown>)[field] = value;
      }
    });
  }

  restoreOriginal(): void {
    this.state.resetStudioToOriginal();
    this.studioFeedbackBanner.set(
      'Restored all sections to your original uploaded resume content.'
    );
  }

  downloadPdf(): void {
    this.state.saveStudioChanges(false);
    const resumeId = this.state.activeResume()?.id;
    const latexCode = generateLatexDocument(this.state.editableStructured());

    if (resumeId) {
      this.isExportingPdf.set(true);
      this.resumeApi.generatePdfOnBackend(resumeId, latexCode).subscribe({
        next: (blob) => {
          this.isExportingPdf.set(false);
          this.triggerBlobDownload(blob, 'pdf');
          this.studioFeedbackBanner.set('PDF downloaded successfully.');
        },
        error: () => {
          this.isExportingPdf.set(false);
          window.print();
        },
      });
    } else {
      window.print();
    }
  }

  downloadDocx(): void {
    this.state.saveStudioChanges(false);
    const r = this.state.editableStructured();
    const contactParts = [
      r.contact.location,
      r.contact.email,
      r.contact.phone,
      r.contact.linkedin,
      r.contact.github,
      r.contact.portfolio,
    ].filter((x) => Boolean(x && x.trim()));

    const skillsHtml = r.skillCategories
      .filter((c) => c.skills.length > 0)
      .map(
        (c) =>
          `<p style="margin:2pt 0;font-size:10.5pt;"><strong>${this.escapeHtml(
            c.categoryName
          )}:</strong> ${this.escapeHtml(c.skills.join(', '))}</p>`
      )
      .join('');

    const expHtml = r.experience
      .map(
        (exp) => `
        <div style="margin-bottom:8pt;">
          <p style="margin:0;font-size:11pt;">
            <strong>${this.escapeHtml(exp.jobTitle)}</strong>
            ${exp.company ? ` — <em>${this.escapeHtml(exp.company)}</em>` : ''}
            ${exp.location ? ` (${this.escapeHtml(exp.location)})` : ''}
            <span style="float:right;font-size:10pt;color:#444;">${this.escapeHtml(
          exp.startDate
        )} – ${this.escapeHtml(exp.endDate)}</span>
          </p>
          <ul style="margin:3pt 0 0 16pt;padding:0;">
            ${exp.bullets
            .filter((b) => b.trim().length > 0)
            .map(
              (b) =>
                `<li style="font-size:10.5pt;margin-bottom:2pt;">${this.escapeHtml(b)}</li>`
            )
            .join('')}
          </ul>
        </div>`
      )
      .join('');

    const projHtml = r.projects
      .map(
        (proj) => `
        <div style="margin-bottom:8pt;">
          <p style="margin:0;font-size:11pt;">
            <strong>${this.escapeHtml(proj.title)}</strong>
            ${proj.technologies
            ? ` | <em>${this.escapeHtml(proj.technologies)}</em>`
            : ''
          }
            ${proj.link
            ? ` <span style="font-size:9.5pt;color:#444;">(${this.escapeHtml(
              proj.link
            )})</span>`
            : ''
          }
          </p>
          <ul style="margin:3pt 0 0 16pt;padding:0;">
            ${proj.bullets
            .filter((b) => b.trim().length > 0)
            .map(
              (b) =>
                `<li style="font-size:10.5pt;margin-bottom:2pt;">${this.escapeHtml(b)}</li>`
            )
            .join('')}
          </ul>
        </div>`
      )
      .join('');

    const eduHtml = r.education
      .map(
        (edu) => `
        <p style="margin:0 0 6pt 0;font-size:10.5pt;">
          <strong>${this.escapeHtml(edu.institution)}</strong> — ${this.escapeHtml(
          edu.degree
        )}${edu.fieldOfStudy ? ` in ${this.escapeHtml(edu.fieldOfStudy)}` : ''}${edu.gradeOrHonors ? ` (${this.escapeHtml(edu.gradeOrHonors)})` : ''
          }
          ${edu.endDate ? ` · ${this.escapeHtml(edu.endDate)}` : ''}
        </p>`
      )
      .join('');

    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${this.escapeHtml(r.contact.fullName || 'ATS Resume')}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #111; line-height: 1.4; margin: 0.6in; }
          h1 { font-size: 20pt; margin: 0 0 4pt 0; text-align: center; text-transform: uppercase; }
          .contact { font-size: 10pt; text-align: center; color: #333; margin-bottom: 12pt; }
          h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 1px solid #222; padding-bottom: 2pt; margin: 12pt 0 6pt 0; }
        </style>
      </head>
      <body>
        <h1>${this.escapeHtml(r.contact.fullName || 'Candidate Name')}</h1>
        <div class="contact">${this.escapeHtml(contactParts.join(' | '))}</div>
        ${r.professionalSummary
        ? `<h2>Professional Summary</h2><p style="font-size:10.5pt;margin:0 0 8pt 0;">${this.escapeHtml(
          r.professionalSummary
        )}</p>`
        : ''
      }
        ${skillsHtml ? `<h2>Skills</h2>${skillsHtml}` : ''}
        ${expHtml ? `<h2>Work Experience</h2>${expHtml}` : ''}
        ${projHtml ? `<h2>Projects</h2>${projHtml}` : ''}
        ${eduHtml ? `<h2>Education</h2>${eduHtml}` : ''}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docContent], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    this.triggerBlobDownload(blob, 'docx');
    this.studioFeedbackBanner.set('Downloaded ATS-friendly DOCX resume.');
  }

  private triggerBlobDownload(blob: Blob, ext: 'pdf' | 'docx'): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = (
      this.state.editableStructured().contact.fullName || 'ATS_Optimized_Resume'
    ).replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `${cleanName}_Resume.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
