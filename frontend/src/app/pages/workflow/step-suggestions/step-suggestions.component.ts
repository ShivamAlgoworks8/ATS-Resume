import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkflowStateService } from '../../../services/workflow-state.service';
import { ResumeSuggestion, SuggestionCategory } from '../../../models/resume.models';

@Component({
  selector: 'app-step-suggestions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './step-suggestions.component.html',
})
export class StepSuggestionsComponent {
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  readonly activeCategoryFilter = signal<SuggestionCategory | 'ALL'>('ALL');
  readonly activeStatusFilter = signal<'ALL' | 'APPROVED' | 'SKIPPED' | 'PENDING'>('ALL');

  readonly categories: { key: SuggestionCategory | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All Suggestions' },
    { key: 'MISSING_SKILLS', label: 'Missing Skills' },
    { key: 'MISSING_KEYWORDS', label: 'Missing Keywords' },
    { key: 'SUMMARY_IMPROVEMENTS', label: 'Summary' },
    { key: 'EXPERIENCE_IMPROVEMENTS', label: 'Experience' },
    { key: 'PROJECT_IMPROVEMENTS', label: 'Projects' },
    { key: 'ACHIEVEMENTS_METRICS', label: 'Achievements & Metrics' },
    { key: 'FORMATTING_IMPROVEMENTS', label: 'Formatting' },
    { key: 'CONTENT_REMOVAL', label: 'Content Cleanup' },
  ];

  readonly filteredSuggestions = computed(() => {
    const category = this.activeCategoryFilter();
    const status = this.activeStatusFilter();
    return this.state.suggestions().filter((item) => {
      const catMatch = category === 'ALL' || item.category === category;
      const statusMatch = status === 'ALL' || item.decision === status;
      return catMatch && statusMatch;
    });
  });

  getCategoryCount(key: SuggestionCategory | 'ALL'): number {
    const all = this.state.suggestions();
    if (key === 'ALL') return all.length;
    return all.filter((s) => s.category === key).length;
  }

  getCategoryBadgeLabel(category: SuggestionCategory): string {
    const found = this.categories.find((c) => c.key === category);
    return found ? found.label : category;
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

  approveItem(id: string): void {
    this.state.setSuggestionDecision(id, 'APPROVED');
  }

  skipItem(id: string): void {
    this.state.setSuggestionDecision(id, 'SKIPPED');
  }

  resetItem(id: string): void {
    this.state.setSuggestionDecision(id, 'PENDING');
  }

  approveWordingOnly(): void {
    this.state.setAllSuggestionsDecision('APPROVED', false);
  }

  approveAll(): void {
    this.state.setAllSuggestionsDecision('APPROVED', true);
  }

  resetAll(): void {
    this.state.setAllSuggestionsDecision('PENDING', true);
  }

  applyAndOpenStudio(): void {
    this.state.applyApprovedSuggestionsToStudio();
    this.router.navigate(['/resume-generator']);
  }

  openStudioWithoutAutoApply(): void {
    this.router.navigate(['/resume-generator']);
  }
}
