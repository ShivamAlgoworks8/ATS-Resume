import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowStateService } from '../../../services/workflow-state.service';
import { AlgoworksResumeComponent } from '../../../shared/algoworks-resume/algoworks-resume.component';
import {
  AchievementItem,
  ContactInfo,
  EducationItem,
  ProjectItem,
  SkillCategoryGroup,
  StructuredResume,
  WorkExperienceItem,
} from '../../../models/resume.models';

type StringField<T> = {
  [K in keyof T]-?: T[K] extends string | undefined ? K : never;
}[keyof T];

@Component({
  selector: 'app-step-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, AlgoworksResumeComponent],
  templateUrl: './step-studio.component.html',
})
export class StepStudioComponent {
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly activeSectionTab = signal<
    'ALL' | 'CONTACT' | 'SUMMARY' | 'SKILLS' | 'EXPERIENCE' | 'PROJECTS' | 'EDUCATION'
  >('ALL');

  readonly newSkillInputs = signal<Record<string, string>>({});
  readonly newSkillCategoryName = signal<string>('');

  readonly editingSkillKey = signal<string | null>(null);
  readonly editingSkillValue = signal<string>('');

  readonly studioFeedbackBanner = signal<string | null>(null);

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
    field: StringField<WorkExperienceItem>,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.experience.find((e) => e.id === expId);
      if (item) {
        item[field] = value;
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
    field: StringField<ProjectItem>,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.projects.find((p) => p.id === projId);
      if (item) {
        item[field] = value;
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
    field: StringField<EducationItem>,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.education.find((e) => e.id === eduId);
      if (item) {
        item[field] = value;
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
    field: StringField<AchievementItem>,
    value: string
  ): void {
    this.patchEditable((draft) => {
      const item = draft.achievements.find((a) => a.id === achId);
      if (item) {
        item[field] = value;
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
    this.state.saveStudioChanges();
    window.print();
  }

  getAllSkills(): string[] {
    const categories = this.state.editableStructured().skillCategories || [];
    return categories.flatMap((c) => c.skills || []);
  }

  getSkillGridRows(columns = 4): string[][] {
    const skills = this.getAllSkills();
    const rows: string[][] = [];
    for (let i = 0; i < skills.length; i += columns) {
      const slice = skills.slice(i, i + columns);
      while (slice.length < columns) {
        slice.push('');
      }
      rows.push(slice);
    }
    return rows;
  }

  getExperienceTech(exp: WorkExperienceItem | null | undefined): string {
    const all = this.getAllSkills();
    if (!exp) return all.slice(0, 8).join(', ');
    const desc = ((exp.jobTitle || '') + ' ' + (exp.bullets || []).join(' ')).toLowerCase();
    const matched = all.filter((s) => desc.includes(s.toLowerCase()));
    return matched.length > 0 ? matched.slice(0, 10).join(', ') : all.slice(0, 8).join(', ');
  }

  async downloadDocx(): Promise<void> {
    this.state.saveStudioChanges();
    const r = this.state.editableStructured();
    const logoMarkup = await this.logoMarkup();
    const allSkills = this.getAllSkills();

    // Build 4-column technology table for DOCX
    let techTableRows = '';
    for (let i = 0; i < allSkills.length; i += 4) {
      const rowSkills = allSkills.slice(i, i + 4);
      while (rowSkills.length < 4) rowSkills.push('');
      const cells = rowSkills
        .map(
          (s) =>
            `<td style="border: 1px solid #d1d5db; padding: 5pt 8pt; font-size: 10pt; width: 25%; color: #1f2937;">${this.escapeHtml(
              s
            )}</td>`
        )
        .join('');
      techTableRows += `<tr>${cells}</tr>`;
    }

    // Build Projects HTML
    const projectsToRender = r.projects.length > 0 ? r.projects : [];
    const projHtml = projectsToRender
      .map(
        (proj) => `
        <div style="margin-bottom: 14pt;">
          <table style="width: 100%; border: none; margin-bottom: 3pt;">
            <tr>
              <td style="font-size: 11pt; font-weight: bold; color: #111827;">${this.escapeHtml(
                proj.title
              )}</td>
              <td style="font-size: 10.5pt; text-align: right; color: #374151;">${this.escapeHtml(
                proj.endDate || proj.startDate || ''
              )}</td>
            </tr>
          </table>
          ${
            proj.description
              ? `<p style="margin: 2pt 0 4pt 0; font-size: 10pt; color: #374151; line-height: 1.45;">${this.escapeHtml(
                  proj.description
                )}</p>`
              : ''
          }
          ${
            proj.capabilities
              ? `<p style="margin: 2pt 0 5pt 0; font-size: 10pt; color: #374151;"><strong>Key Capabilities:</strong> ${this.escapeHtml(
                  proj.capabilities
                )}</p>`
              : ''
          }
          ${
            proj.technologies
              ? `<div style="background-color: #f9fafb; border-left: 3.5pt solid #10b981; padding: 6pt 10pt; margin: 5pt 0; font-size: 10pt; color: #1f2937;"><strong>Technology Stack Used:</strong> ${this.escapeHtml(
                  proj.technologies
                )}</div>`
              : ''
          }
          ${
            proj.bullets && proj.bullets.length > 0
              ? `<p style="margin: 6pt 0 2pt 0; font-size: 10pt; font-weight: bold; color: #1f2937;">Responsibilities</p>
                 <ul style="margin: 2pt 0 0 16pt; padding: 0;">
                   ${proj.bullets
                     .filter((b) => b.trim().length > 0)
                     .map(
                       (b) =>
                         `<li style="font-size: 10pt; color: #374151; margin-bottom: 2pt;">${this.escapeHtml(
                           b
                         )}</li>`
                     )
                     .join('')}
                 </ul>`
              : ''
          }
        </div>`
      )
      .join('');

    const expHtml =
      r.projects.length === 0 && r.experience.length > 0
        ? r.experience
            .map(
              (exp) => `
          <div style="margin-bottom: 12pt;">
            <p style="margin: 0; font-size: 11pt; font-weight: bold;">
              ${this.escapeHtml(exp.jobTitle)} — ${this.escapeHtml(exp.company)}
              <span style="float: right; font-weight: normal; font-size: 10pt; color: #444;">${this.escapeHtml(
                exp.startDate
              )} – ${this.escapeHtml(exp.endDate)}</span>
            </p>
            <div style="background-color: #f9fafb; border-left: 3.5pt solid #10b981; padding: 5pt 8pt; margin: 4pt 0; font-size: 10pt;">
              <strong>Technology Stack Used:</strong> ${this.escapeHtml(this.getExperienceTech(exp))}
            </div>
            <ul style="margin: 3pt 0 0 16pt; padding: 0;">
              ${exp.bullets
                .filter((b) => b.trim().length > 0)
                .map(
                  (b) =>
                    `<li style="font-size: 10pt; margin-bottom: 2pt;">${this.escapeHtml(b)}</li>`
                )
                .join('')}
            </ul>
          </div>`
            )
            .join('')
        : '';

    const eduHtml = r.education
      .map(
        (edu) => `
        <p style="margin: 0 0 5pt 0; font-size: 10.5pt;">
          <strong>${this.escapeHtml(edu.institution)}</strong> — ${this.escapeHtml(
          edu.degree
        )}${edu.fieldOfStudy ? ` in ${this.escapeHtml(edu.fieldOfStudy)}` : ''}${
          edu.gradeOrHonors ? ` (${this.escapeHtml(edu.gradeOrHonors)})` : ''
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
        <title>${this.escapeHtml(r.contact.fullName || 'Algoworks Resume')}</title>
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #111; line-height: 1.45; margin: 0.5in; }
          .logo-header { font-size: 18pt; font-weight: bold; color: #00A86B; letter-spacing: 1pt; margin-bottom: 4pt; }
          .header-line { border-bottom: 2pt solid #111827; margin-bottom: 12pt; }
          .candidate-name { font-size: 20pt; font-weight: bold; margin: 0 0 2pt 0; color: #111827; }
          .candidate-title { font-size: 12pt; color: #4b5563; margin: 0 0 2pt 0; }
          .candidate-exp { font-size: 11pt; color: #4b5563; margin: 0 0 10pt 0; }
          .section-heading { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 14pt 0 6pt 0; color: #111827; letter-spacing: 0.5pt; }
          table.tech-table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
        </style>
      </head>
      <body>
        ${logoMarkup}
        <div class="header-line"></div>

        <div class="candidate-name">${this.escapeHtml(r.contact.fullName || 'Aditya Srivastav')}</div>
        <div class="candidate-title">${this.escapeHtml(r.contact.title || 'Principal Full Stack Engineer')}</div>
        <div class="candidate-exp">${this.escapeHtml(r.contact.totalExperience || 'Total Experience: 15 Years')}</div>

        ${
          r.professionalSummary
            ? `<div class="section-heading">PROFESSIONAL SUMMARY</div>
               <p style="font-size: 10pt; line-height: 1.5; color: #374151; margin: 0 0 12pt 0;">${this.escapeHtml(
                 r.professionalSummary
               )}</p>`
            : ''
        }

        ${
          techTableRows
            ? `<div class="section-heading">TECHNOLOGY STACK</div>
               <table class="tech-table">${techTableRows}</table>`
            : ''
        }

        ${
          projHtml || expHtml
            ? `<div class="section-heading">PROJECT EXPERIENCE</div>${projHtml}${expHtml}`
            : ''
        }

        ${eduHtml ? `<div class="section-heading">EDUCATION</div>${eduHtml}` : ''}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docContent], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    this.triggerBlobDownload(blob, 'docx');
    this.studioFeedbackBanner.set('Downloaded Algoworks-format ATS DOCX resume.');
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

  private async logoMarkup(): Promise<string> {
    try {
      const response = await fetch('algoworks-logo.png');
      if (!response.ok) {
        return '<div class="logo-header">ALGOWORKS</div>';
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return `<img src="data:image/png;base64,${btoa(binary)}" alt="Algoworks" style="height:28pt;" />`;
    } catch {
      return '<div class="logo-header">ALGOWORKS</div>';
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
