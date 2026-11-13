import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkflowStateService } from '../../../services/workflow-state.service';
import { ResumeSuggestion, SuggestionCategory } from '../../../models/resume.models';

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

  getExistingBoxLabel(item: ResumeSuggestion): string {
    switch (item.category) {
      case 'PROJECT_IMPROVEMENTS':
        return 'EXISTING PROJECT DESCRIPTION';
      case 'EXPERIENCE_IMPROVEMENTS':
      case 'ACHIEVEMENTS_METRICS':
        return 'EXISTING EXPERIENCE DESCRIPTION';
      case 'SUMMARY_IMPROVEMENTS':
        return 'EXISTING PROFESSIONAL SUMMARY';
      case 'MISSING_SKILLS':
      case 'MISSING_KEYWORDS':
        return 'CURRENT SKILLS STATUS';
      case 'FORMATTING_IMPROVEMENTS':
        return 'CURRENT FORMATTING STATUS';
      case 'CONTENT_REMOVAL':
        return 'EXISTING CONTENT TO CLEAN UP';
      default:
        return 'EXISTING DESCRIPTION';
    }
  }

  getProposedBoxLabel(item: ResumeSuggestion): string {
    switch (item.category) {
      case 'PROJECT_IMPROVEMENTS':
        return 'IMPROVED PROJECT SUGGESTION';
      case 'EXPERIENCE_IMPROVEMENTS':
      case 'ACHIEVEMENTS_METRICS':
        return 'IMPROVED EXPERIENCE SUGGESTION';
      case 'SUMMARY_IMPROVEMENTS':
        return 'IMPROVED SUMMARY SUGGESTION';
      case 'MISSING_SKILLS':
      case 'MISSING_KEYWORDS':
        return 'SUGGESTED SKILL ADDITION';
      case 'FORMATTING_IMPROVEMENTS':
        return 'RECOMMENDED FORMATTING FIX';
      case 'CONTENT_REMOVAL':
        return 'RECOMMENDED CLEANUP';
      default:
        return 'RECOMMENDED IMPROVEMENT';
    }
  }

  addMissingSkill(skill: string): void {
    this.state.addMissingSkill(skill);
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
