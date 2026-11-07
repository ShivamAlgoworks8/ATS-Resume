import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { ResumeApiService, ResumeRecord } from '../../services/resume.service';
import { WorkflowStateService } from '../../services/workflow-state.service';

interface DisplayResume {
  id: string;
  name: string;
  subtitle: string;
  type: 'PDF' | 'DOC';
  tag: string;
  rawRecord: ResumeRecord;
}

@Component({
  selector: 'app-my-resumes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-resumes.html',
})
export class MyResumesComponent implements OnInit {
  readonly toastService = inject(ToastService);
  readonly resumeApi = inject(ResumeApiService);
  readonly workflowState = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly filterType = signal<'ALL' | 'PDF' | 'DOC'>('ALL');
  readonly editingId = signal<string | null>(null);
  readonly editingName = signal('');
  readonly inspectingResume = signal<ResumeRecord | null>(null);

  readonly allResumes = computed<DisplayResume[]>(() => {
    return this.resumeApi.resumes().map((r) => this.mapBackendResume(r));
  });

  readonly filteredResumes = computed<DisplayResume[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const type = this.filterType();
    return this.allResumes().filter((item) => {
      const matchesType = type === 'ALL' || item.type === type;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  });

  readonly filterLabel = computed(() => {
    const current = this.filterType();
    if (current === 'PDF') return 'PDF resumes ⌄';
    if (current === 'DOC') return 'DOCX resumes ⌄';
    return 'All resumes ⌄';
  });

  ngOnInit(): void {
    this.resumeApi.loadResumes();
  }

  cycleFilter(): void {
    const order: ('ALL' | 'PDF' | 'DOC')[] = ['ALL', 'PDF', 'DOC'];
    const next = order[(order.indexOf(this.filterType()) + 1) % order.length];
    this.filterType.set(next);
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (!this.searchOpen()) {
      this.searchQuery.set('');
    }
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

    analyzeResume(item: DisplayResume): void {
      this.workflowState.setActiveResume(item.rawRecord);
      this.router.navigate(['/resume-analyzer']);
    }

    openInGenerator(item: DisplayResume): void {
      this.workflowState.setActiveResume(item.rawRecord);
      this.router.navigate(['/resume-generator']);
    }

    inspectExtractedText(item: DisplayResume): void {
    this.inspectingResume.set(item.rawRecord);
  }

  startRename(item: DisplayResume): void {
    this.editingId.set(item.id);
    this.editingName.set(item.name);
  }

  onEditInput(event: Event): void {
    this.editingName.set((event.target as HTMLInputElement).value);
  }

  saveRename(item: DisplayResume): void {
    const newName = this.editingName().trim();
    if (!newName) {
      this.toastService.show('File name cannot be empty.');
      return;
    }
    this.resumeApi
      .updateResumeMetadata(item.id, { originalFileName: newName, fileName: newName })
      .subscribe({
        next: () => {
          this.editingId.set(null);
          this.toastService.show(`Renamed to ${newName}`);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Could not rename resume.');
        },
      });
  }

  cancelRename(): void {
    this.editingId.set(null);
  }

  deleteResume(item: DisplayResume): void {
    this.resumeApi.deleteResume(item.id).subscribe({
      next: () => {
        if (this.inspectingResume()?.id === item.id) {
          this.inspectingResume.set(null);
        }
        this.toastService.show(`Deleted ${item.name}`);
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Could not delete resume.');
      },
    });
  }

  private mapBackendResume(r: ResumeRecord): DisplayResume {
    const ext = (r.fileType || '').toLowerCase();
    const kb = Math.max(1, Math.round((r.fileSize || 0) / 1024));
    const dateStr = r.uploadDate
      ? new Date(r.uploadDate).toLocaleDateString('en-US', {
          month: 'short',
      day: 'numeric',
        year: 'numeric',
        })
      : 'Recently';
    return {
  id: r.id,
  name: r.originalFileName || r.fileName,
  subtitle: `Uploaded ${dateStr} · ${kb} KB`,
  type: ext === 'docx' ? 'DOC' : 'PDF',
  tag: r.processingStatus === 'COMPLETED' ? 'Parsed' : r.processingStatus,
  rawRecord: r,
};
  }
}
