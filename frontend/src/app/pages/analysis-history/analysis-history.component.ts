import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { WorkflowStateService } from '../../services/workflow-state.service';
import { AnalysisHistoryRecord } from '../../models/resume.models';

@Component({
  selector: 'app-analysis-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analysis-history.html',
})
export class AnalysisHistoryComponent {
  readonly toastService = inject(ToastService);
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly highScoreOnly = signal(false);

  readonly visibleEntries = computed(() => {
    const list = this.state.analysisHistory();
    return this.highScoreOnly() ? list.filter((e) => e.overallScore >= 75) : list;
  });

  readonly averageScore = computed(() => {
    const list = this.state.analysisHistory();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, item) => acc + item.overallScore, 0);
    return Math.round(sum / list.length);
  });

  toggleFilter(): void {
    this.highScoreOnly.update((v) => !v);
  }

  openAnalysis(entry: AnalysisHistoryRecord): void {
    this.state.jobTitle.set(entry.jobTitle);
    this.state.companyName.set(entry.companyName);
    this.router.navigate(['/analysis-results']);
  }
}
