import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { WorkflowStateService } from '../../services/workflow-state.service';
import { SavedJobDescription } from '../../models/resume.models';

@Component({
  selector: 'app-saved-jds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './saved-jds.html',
})
export class SavedJdsComponent {
  readonly toastService = inject(ToastService);
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly showCreateModal = signal(false);
  readonly searchQuery = signal('');

  readonly newTitle = signal('');
  readonly newCompany = signal('');
  readonly newLocation = signal('Remote / Hybrid');
  readonly newWorkplaceType = signal<'REMOTE' | 'HYBRID' | 'ON_SITE'>('HYBRID');
  readonly newKeySkillsInput = signal('');
  readonly newDescription = signal('');

  readonly filteredJds = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.state.savedJds();
    return this.state.savedJds().filter(
      (jd) =>
        jd.title.toLowerCase().includes(q) ||
        jd.company.toLowerCase().includes(q) ||
        jd.keySkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  getColorClass(index: number): string {
    const classes = ['company-purple', 'company-blue', 'company-orange', 'company-green'];
    return classes[index % classes.length];
  }

  saveNewJobDescription(): void {
    const title = this.newTitle().trim();
    const company = this.newCompany().trim();
    const desc = this.newDescription().trim();

    if (!title || !company || !desc) {
      this.toastService.show('Please provide job title, company, and description.');
      return;
    }

    const skills = this.newKeySkillsInput()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    this.state.addSavedJd({
      title,
      company,
      location: this.newLocation().trim() || 'Hybrid',
      workplaceType: this.newWorkplaceType(),
      employmentType: 'FULL TIME',
      keySkills: skills.length > 0 ? skills : ['Java', 'Spring Boot', 'REST APIs'],
      descriptionText: desc,
    });

    this.newTitle.set('');
    this.newCompany.set('');
    this.newKeySkillsInput.set('');
    this.newDescription.set('');
    this.showCreateModal.set(false);
  }

  removeJd(id: string, title: string): void {
    this.state.deleteSavedJd(id);
    this.toastService.show(`Removed "${title}"`);
  }

  tailorResumeForJd(jd: SavedJobDescription): void {
    this.state.loadJobDescription(jd);
    this.toastService.show(`Loaded "${jd.title}" into Step 1 Upload & JD.`);
    this.router.navigate(['/workflow/upload']);
  }
}
