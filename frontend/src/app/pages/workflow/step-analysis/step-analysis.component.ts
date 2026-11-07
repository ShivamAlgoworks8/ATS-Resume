import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkflowStateService } from '../../../services/workflow-state.service';
import { SuggestionCategory } from '../../../models/resume.models';

@Component({
  selector: 'app-step-analysis',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './step-analysis.component.html',
})
export class StepAnalysisComponent {
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly showDetailedReport = signal<boolean>(true);

  getScoreColor(score: number): string {
    if (score >= 80) return '#176B45';
    if (score >= 65) return '#105438';
    if (score >= 50) return '#B45309';
    return '#B91C1C';
  }

  getScoreBadgeClass(score: number): string {
    if (score >= 80) return 'badge-green';
    if (score >= 65) return 'badge-blue';
    if (score >= 50) return 'badge-orange';
    return 'badge-red';
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Strong ATS Match';
    if (score >= 65) return 'Good Match · Optimizable';
    if (score >= 50) return 'Moderate Match';
    return 'Needs Tailoring';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'STRONG':
        return 'badge-green';
      case 'MODERATE':
        return 'badge-blue';
      case 'NEEDS_WORK':
        return 'badge-orange';
      default:
        return 'badge-red';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'STRONG':
        return 'Strong';
      case 'MODERATE':
        return 'Moderate';
      case 'NEEDS_WORK':
        return 'Needs Work';
      case 'MISSING':
        return 'Missing';
      default:
        return status;
    }
  }

  getCategoryLabel(category: SuggestionCategory): string {
    const map: Record<SuggestionCategory, string> = {
      MISSING_SKILLS: 'Missing Skill',
      MISSING_KEYWORDS: 'Missing Keyword',
      SUMMARY_IMPROVEMENTS: 'Summary',
      EXPERIENCE_IMPROVEMENTS: 'Experience',
      PROJECT_IMPROVEMENTS: 'Projects',
      ACHIEVEMENTS_METRICS: 'Impact & Metrics',
      FORMATTING_IMPROVEMENTS: 'ATS Formatting',
      CONTENT_REMOVAL: 'Content Cleanup',
    };
    return map[category] || category;
  }

  approveSuggestion(id: string): void {
    this.state.setSuggestionDecision(id, 'APPROVED');
  }

  skipSuggestion(id: string): void {
    this.state.setSuggestionDecision(id, 'SKIPPED');
  }

  viewDetailedReport(): void {
    this.showDetailedReport.set(true);
    const el = document.getElementById('detailed-ats-report-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      this.router.navigate(['/detailed-report']);
    }
  }

  generateAtsFriendlyResume(): void {
    if (this.state.approvedSuggestions().length === 0 && this.state.suggestions().length > 0) {
      this.state.setAllSuggestionsDecision('APPROVED', false);
    }
    this.state.applyApprovedSuggestionsToStudio();
    this.router.navigate(['/resume-generator']);
  }

  backToAnalyzer(): void {
    this.router.navigate(['/resume-analyzer']);
  }
}
