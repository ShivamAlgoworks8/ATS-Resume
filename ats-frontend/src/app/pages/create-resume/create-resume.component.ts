import { Component, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-create-resume',
  standalone: true,
  templateUrl: './create-resume.html',
})
export class CreateResumeComponent {
  private readonly toast = inject(ToastService);
  readonly jd = signal('');
  readonly fileName = signal('My_Resume.pdf');
  readonly jdMode = signal<'paste' | 'upload'>('paste');
  readonly analyzed = signal(false);
  readonly generated = signal(false);
  readonly busy = signal(false);
  readonly jdCount = computed(() => this.jd().length);
  readonly skills = ['Java', 'Spring Boot', 'REST APIs', 'MySQL', 'Git', 'JUnit'];
  readonly missing = ['Docker', 'AWS', 'CI/CD', 'Kubernetes'];

  updateJd(event: Event): void { this.jd.set((event.target as HTMLTextAreaElement).value.slice(0, 5000)); }
  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) { this.fileName.set(file.name); this.toast.show(`${file.name} is ready to analyze.`); }
  }
  analyze(): void {
    if (this.fileName() === 'No resume uploaded') { this.toast.show('Upload a resume to continue.'); return; }
    if (!this.jd().trim() && this.jdMode() === 'paste') { this.toast.show('Add a job description to get your ATS analysis.'); return; }
    this.busy.set(true);
    window.setTimeout(() => { this.busy.set(false); this.analyzed.set(true); this.toast.show('Your resume analysis is ready.'); }, 650);
  }
  generate(): void { this.generated.set(true); this.toast.show('Your ATS-friendly resume draft is ready.'); }
  showTip(): void { this.toast.show('Your resume tips are ready.'); }
  showDetails(): void { this.toast.show('Detailed analysis is ready to explore.'); }
}
