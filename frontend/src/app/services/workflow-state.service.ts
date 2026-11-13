import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AnalysisHistoryRecord,
  AtsAnalysisResponse,
  ResumeRecord,
  ResumeSuggestion,
  SavedJobDescription,
  StructuredResume,
  SuggestionDecision,
} from '../models/resume.models';
import {
  buildPreviewAtsAnalysis,
  createEmptyStructuredResume,
  parseExtractedTextToStructuredResume,
} from '../mocks/resume-mock.data';
import { generateLatexDocument } from '../templates/latex-resume.template';
import { ResumeApiService } from './resume.service';
import { ToastService } from './toast.service';

export type ResumeTemplateId =
  | 'algoworks-ats'
  | 'classic-ats'
  | 'modern-executive'
  | 'compact-technical';

@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly resumeApi = inject(ResumeApiService);
  private readonly toast = inject(ToastService);

  readonly activeResume = signal<ResumeRecord | null>(null);
  readonly jobTitle = signal('');
  readonly companyName = signal('');
  readonly jobDescription = signal('');
  readonly jdFileName = signal('');
  readonly jdInputMode = signal<'paste' | 'upload'>('paste');

  readonly analysisResult = signal<AtsAnalysisResponse | null>(null);
  readonly analyzing = signal(false);

  readonly originalStructured = signal<StructuredResume>(createEmptyStructuredResume());
  readonly editableStructured = signal<StructuredResume>(createEmptyStructuredResume());
  readonly selectedTemplate = signal<ResumeTemplateId>('algoworks-ats');
  readonly appliedSuggestionCount = signal(0);
  readonly lastSavedAt = signal<string | null>(null);

  readonly pdfGenerating = signal(false);
  readonly backendPdfError = signal<string | null>(null);

  readonly savedJds = signal<SavedJobDescription[]>([]);
  readonly analysisHistory = signal<AnalysisHistoryRecord[]>([]);

  readonly hasUploadedResume = computed(() => this.activeResume() !== null);
  readonly hasAnalysis = computed(() => this.analysisResult() !== null);

  readonly suggestions = computed<ResumeSuggestion[]>(
    () => this.analysisResult()?.suggestions ?? []
  );

  readonly approvedSuggestions = computed(() =>
    this.suggestions().filter((s) => s.decision === 'APPROVED')
  );

  readonly skippedSuggestions = computed(() =>
    this.suggestions().filter((s) => s.decision === 'SKIPPED')
  );

  readonly pendingSuggestions = computed(() =>
    this.suggestions().filter((s) => s.decision === 'PENDING')
  );

  readonly latexSource = computed(() => generateLatexDocument(this.editableStructured()));

  setActiveResume(record: ResumeRecord): void {
    this.activeResume.set(record);
    const parsedOrig = parseExtractedTextToStructuredResume(
      record.extractedText,
      record.originalFileName || record.fileName
    );
    this.originalStructured.set(parsedOrig);
    this.editableStructured.set(JSON.parse(JSON.stringify(parsedOrig)));
    this.analysisResult.set(null);
    this.appliedSuggestionCount.set(0);
    this.backendPdfError.set(null);
  }

  clearActiveResume(): void {
    this.activeResume.set(null);
    this.analysisResult.set(null);
    this.originalStructured.set(createEmptyStructuredResume());
    this.editableStructured.set(createEmptyStructuredResume());
    this.backendPdfError.set(null);
  }

  loadJobDescription(jd: SavedJobDescription): void {
    this.jobTitle.set(jd.title);
    this.companyName.set(jd.company);
    this.jobDescription.set(jd.descriptionText);
    this.jdInputMode.set('paste');
  }

  runAnalysis(onComplete: () => void): void {
    const resume = this.activeResume();
    if (!resume) {
      this.toast.show('Please upload or select a resume first.');
      return;
    }
    const jdText = this.jobDescription().trim();
    if (!jdText) {
      this.toast.show('Please paste or upload a target Job Description.');
      return;
    }

    this.analyzing.set(true);
    const requestPayload = {
      resumeId: resume.id,
      jobTitle: this.jobTitle().trim() || 'Target Role',
      companyName: this.companyName().trim() || '',
      jobDescription: jdText,
    };

    this.resumeApi.analyzeResumeOnBackend(resume.id, requestPayload).subscribe({
      next: (backendResult) => {
        const result: AtsAnalysisResponse = {
          ...backendResult,
          isMockPreview: false,
        };
        this.analysisResult.set(result);
        this.recordHistoryEntry(resume, result);
        this.analyzing.set(false);
        this.toast.show('ATS analysis completed.');
        onComplete();
      },
      error: () => {
        // The current backend does not expose /analyze, so keep the local preview usable
        // while marking it clearly as an estimate.
        const computedAnalysis = buildPreviewAtsAnalysis(
          resume.id,
          this.editableStructured(),
          resume.extractedText,
          requestPayload.jobTitle,
          requestPayload.companyName,
          requestPayload.jobDescription
        );
        this.analysisResult.set(computedAnalysis);
        this.recordHistoryEntry(resume, computedAnalysis);
        this.analyzing.set(false);
        this.toast.show('Preview analysis complete. This result was generated locally.');
        onComplete();
      },
    });
  }

  setSuggestionDecision(suggestionId: string, decision: SuggestionDecision): void {
    const current = this.analysisResult();
    if (!current) return;
    const updatedSuggestions = current.suggestions.map((s) =>
      s.id === suggestionId ? { ...s, decision } : s
    );
    this.analysisResult.set({ ...current, suggestions: updatedSuggestions });
  }

  setAllSuggestionsDecision(decision: SuggestionDecision, includeSkills = true): void {
    const current = this.analysisResult();
    if (!current) return;
    const updatedSuggestions = current.suggestions.map((s) => {
      if (!includeSkills && s.requiresCandidateVerification) {
        return s;
      }
      return { ...s, decision };
    });
    this.analysisResult.set({ ...current, suggestions: updatedSuggestions });
  }

  applyApprovedSuggestionsToStudio(): number {
    const approved = this.approvedSuggestions();
    const draft: StructuredResume = JSON.parse(JSON.stringify(this.editableStructured()));
    let count = 0;

    for (const sug of approved) {
      if (sug.category === 'SUMMARY_IMPROVEMENTS') {
        draft.professionalSummary = sug.suggestedChange;
        draft.summaryAiModified = true;
        count++;
      } else if (sug.category === 'MISSING_SKILLS') {
        const skillToAdd = sug.suggestedChange.trim();
        const allExisting = draft.skillCategories
          .flatMap((c) => c.skills)
          .map((s) => s.toLowerCase());
        if (skillToAdd && !allExisting.includes(skillToAdd.toLowerCase())) {
          if (draft.skillCategories.length === 0) {
            draft.skillCategories.push({
              id: 'cat-1',
              categoryName: 'Technical Skills',
              skills: [skillToAdd],
            });
          } else {
            const targetGroup = draft.skillCategories[draft.skillCategories.length - 1];
            targetGroup.skills = [...targetGroup.skills, skillToAdd];
          }
          count++;
        }
      } else if (
        sug.category === 'EXPERIENCE_IMPROVEMENTS' ||
        sug.category === 'ACHIEVEMENTS_METRICS' ||
        sug.category === 'MISSING_KEYWORDS'
      ) {
        if (draft.experience.length > 0) {
          const firstExp = draft.experience[0];
          if (!firstExp.bullets.includes(sug.suggestedChange)) {
            firstExp.bullets = [sug.suggestedChange, ...firstExp.bullets];
            firstExp.aiModified = true;
            count++;
          }
        }
      } else if (sug.category === 'PROJECT_IMPROVEMENTS') {
        if (draft.projects.length > 0) {
          const firstProj = draft.projects[0];
          if (!firstProj.bullets.includes(sug.suggestedChange)) {
            firstProj.bullets = [sug.suggestedChange, ...firstProj.bullets];
            firstProj.aiModified = true;
            count++;
          }
        }
      }
    }

    this.editableStructured.set(draft);
    this.appliedSuggestionCount.set(count);
    return count;
  }

  resetStudioToOriginal(): void {
    const origCopy: StructuredResume = JSON.parse(JSON.stringify(this.originalStructured()));
    this.editableStructured.set(origCopy);
    this.appliedSuggestionCount.set(0);
    this.toast.show('Restored original resume content.');
  }

  saveStudioChanges(): void {
    const resume = this.activeResume();
    const currentStructured = this.editableStructured();
    this.lastSavedAt.set(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    if (!resume) {
      this.toast.show('Saved changes to Resume Generator.');
      return;
    }

    this.resumeApi.saveStructuredResumeOnBackend(resume.id, currentStructured).subscribe({
      next: (saved) => {
        this.editableStructured.set(saved);
        this.toast.show('Resume changes saved to backend.');
      },
      error: () => {
        this.toast.show('Could not save changes to the backend. Your edits remain in this session only.');
      },
    });
  }

  addSavedJd(jd: Omit<SavedJobDescription, 'id' | 'savedDate'>): void {
    const created: SavedJobDescription = {
      ...jd,
      id: `jd-${Date.now()}`,
      savedDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      isMockData: false,
    };
    this.savedJds.update((list) => [created, ...list]);
    this.toast.show(`Saved "${created.title}".`);
  }

  deleteSavedJd(id: string): void {
    this.savedJds.update((list) => list.filter((item) => item.id !== id));
    this.toast.show('Removed job description.');
  }

  private recordHistoryEntry(resume: ResumeRecord, analysis: AtsAnalysisResponse): void {
    const entry: AnalysisHistoryRecord = {
      id: analysis.analysisId,
      resumeId: resume.id,
      resumeFileName: resume.originalFileName || resume.fileName,
      jobTitle: analysis.jobTitle,
      companyName: analysis.companyName || 'Target Role',
      analyzedDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      overallScore: analysis.overallScore,
      scoreDelta: `${analysis.matchedKeywords.length} keywords matched`,
      status: 'Completed',
      isMockData: false,
    };
    this.analysisHistory.update((list) => [entry, ...list]);
  }
}
