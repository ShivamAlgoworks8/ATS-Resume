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
  createEmptyStructuredResume,
  parseExtractedTextToStructuredResume,
} from '../mocks/resume-mock.data';
import { generateLatexDocument } from '../templates/latex-resume.template';
import { ResumeApiService } from './resume.service';
import { ToastService } from './toast.service';

export type ResumeTemplateId = 'classic-ats' | 'modern-executive' | 'compact-technical';

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
  readonly selectedTemplate = signal<ResumeTemplateId>('classic-ats');
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
    const structured = record.structuredResume;
    if (structured) {
      this.originalStructured.set(JSON.parse(JSON.stringify(structured)));
      this.editableStructured.set(JSON.parse(JSON.stringify(structured)));
    } else {
      const name = record.originalFileName || record.fileName;
      this.originalStructured.set(parseExtractedTextToStructuredResume(record.extractedText, name));
      this.editableStructured.set(parseExtractedTextToStructuredResume(record.extractedText, name));
      this.resumeApi.reparseResume(record.id).subscribe({
        next: (updated) => {
          if (this.activeResume()?.id === updated.id && updated.structuredResume) {
            this.activeResume.set(updated);
            this.originalStructured.set(JSON.parse(JSON.stringify(updated.structuredResume)));
            this.editableStructured.set(JSON.parse(JSON.stringify(updated.structuredResume)));
          }
        },
        error: () => {},
      });
    }
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
        if (result.structuredResume) {
          this.originalStructured.set(JSON.parse(JSON.stringify(result.structuredResume)));
          this.editableStructured.set(JSON.parse(JSON.stringify(result.structuredResume)));
        }
        this.analysisResult.set(result);
        this.recordHistoryEntry(resume, result);
        this.analyzing.set(false);
        this.toast.show('ATS analysis completed.');
        onComplete();
      },
      error: (err) => {
        this.analyzing.set(false);
        this.toast.show(err?.error?.message || 'Analysis failed. Make sure the backend is running.');
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
      const rawText = (sug.suggestedChange || '').trim();
      const isAddSentence = /^(?:please\s+)?(?:add|include|insert|append)\s+(?:a\s+)?(?:sentence|line|statement)/i.test(rawText);
      const cleaned = this.cleanResumeLine(rawText);
      if (!cleaned || this.isInstructionalPhrase(cleaned)) {
        continue;
      }

      if (sug.actionType === 'REPLACE_SUMMARY' || sug.category === 'SUMMARY_IMPROVEMENTS') {
        const existing = (draft.professionalSummary || '').trim();
        let nextSummary = cleaned;
        if (isAddSentence && existing && !existing.includes(cleaned)) {
          const sep = existing.endsWith('.') ? ' ' : '. ';
          nextSummary = existing + sep + cleaned;
        }
        draft.professionalSummary = this.capSummaryWords(nextSummary, 80);
        draft.summaryAiModified = true;
        count++;
      } else if (sug.actionType === 'ADD_SKILL' || sug.category === 'MISSING_SKILLS') {
        const strippedSkills = cleaned
          .replace(/\s+(?:to|in)\s+(?:your\s+|the\s+)?(?:skills?|resume|section).*$/i, '')
          .split(/[,;/]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 35 && !this.isInstructionalPhrase(s));
        const key = (v: string) => v.toLowerCase().replace(/[\s.\-_/]+/g, '');
        for (const skillToAdd of strippedSkills) {
          const exists = draft.skillCategories.some((c) => c.skills.some((x) => key(x) === key(skillToAdd)));
          if (!exists) {
            if (draft.skillCategories.length === 0) {
              draft.skillCategories.push({ id: 'cat-1', categoryName: 'Skills', skills: [skillToAdd] });
            } else {
              const target = draft.skillCategories[draft.skillCategories.length - 1];
              target.skills = [...target.skills, skillToAdd];
            }
            count++;
          }
        }
      } else if (
        sug.category === 'PROJECT_IMPROVEMENTS' &&
        sug.improvedBullets &&
        sug.improvedBullets.length > 0 &&
        draft.projects.length > 0
      ) {
        const cleanTitle = (v?: string) => (v || '').trim().toLowerCase();
        const hintIdx = sug.targetEntryIndex ?? -1;
        let targetProj =
          hintIdx >= 0 &&
          hintIdx < draft.projects.length &&
          (!sug.projectTitle || cleanTitle(draft.projects[hintIdx].title) === cleanTitle(sug.projectTitle))
            ? draft.projects[hintIdx]
            : draft.projects.find((p) => cleanTitle(p.title) === cleanTitle(sug.projectTitle));
        if (!targetProj && hintIdx >= 0 && hintIdx < draft.projects.length) {
          targetProj = draft.projects[hintIdx];
        }
        if (targetProj) {
          targetProj.bullets = [...sug.improvedBullets];
          targetProj.aiModified = true;
          count++;
        }
      } else if (sug.actionType === 'REPLACE_BULLET') {
        const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9+#]/g, '');
        const target = sug.originalText ? norm(sug.originalText) : '';
        let applied = false;
        if (target) {
          for (const entry of [...draft.experience, ...draft.projects]) {
            const idx = entry.bullets.findIndex((b) => norm(b) === target || norm(b).includes(target) || target.includes(norm(b)));
            if (idx >= 0) {
              entry.bullets[idx] = cleaned;
              entry.aiModified = true;
              count++;
              applied = true;
              break;
            }
          }
        }
        if (!applied) {
          const isProject = sug.category === 'PROJECT_IMPROVEMENTS' || sug.targetSection?.toLowerCase().includes('project');
          const list = isProject ? draft.projects : draft.experience;
          if (list.length > 0) {
            const eIdx = Math.min(Math.max(sug.targetEntryIndex ?? 0, 0), list.length - 1);
            const entry = list[eIdx];
            if (entry.bullets.length > 0) {
              const bIdx = Math.min(Math.max(sug.targetBulletIndex ?? 0, 0), entry.bullets.length - 1);
              entry.bullets[bIdx] = cleaned;
            } else {
              entry.bullets.push(cleaned);
            }
            entry.aiModified = true;
            count++;
          }
        }
      }
    }

    this.editableStructured.set(draft);
    this.appliedSuggestionCount.set(count);

    const resume = this.activeResume();
    if (resume && approved.length > 0) {
      this.resumeApi
        .optimizeResumeOnBackend(resume.id, {
          resumeId: resume.id,
          approvedSuggestionIds: approved.map((s) => s.id),
          jobDescription: this.jobDescription(),
        })
        .subscribe({
          next: (optimized) => {
            if (optimized) {
              this.editableStructured.set(optimized);
            }
          },
          error: () => {},
        });
    }

    return count;
  }

  private cleanResumeLine(text: string): string {
    if (!text) return '';
    let t = text.trim();
    const quotedMatch = t.match(
      /^(?:add|include|insert|rephrase|rewrite|consider|you\s+should|you\s+could|suggested|recommended|try|use)[^"'“‘]*["“'‘]([^"”'’]{15,})["”'’]\s*\.?\s*$/i
    );
    if (quotedMatch) {
      t = quotedMatch[1].trim();
    } else {
      t = t
        .replace(
          /^(?:(?:please\s+)?(?:add|include|insert|append)\s+(?:a\s+|the\s+|following\s+)?(?:sentence|bullet|line|statement|point|phrase|skill|keywords?)?(?:\s+(?:such\s+as|like|stating|to\s+[^:]+))?|(?:please\s+)?(?:rephrase|rewrite|revise|reword|change|update|replace|modify)(?:\s+(?:this|the\s+bullet|the\s+summary|it))?(?:\s+(?:to|as|with|like))?|(?:consider\s+)?(?:adding|including|rephrasing|rewriting|mentioning|highlighting|stating)(?:\s+(?:a\s+sentence|a\s+bullet|something)\s+(?:such\s+as|like))?|you\s+(?:should|could|can|may)\s+(?:mention|add|include|write|state|highlight|rephrase(?:\s+to)?)|(?:suggested|recommended)\s+(?:rewrite|change|bullet|summary|addition|text|phrasing)|for\s+example|\be\.g\.,?)\s*[:\-–—]?\s*/i,
          ''
        )
        .trim();
    }
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith("'") && t.endsWith("'")) ||
      (t.startsWith('“') && t.endsWith('”')) ||
      (t.startsWith('‘') && t.endsWith('’'))
    ) {
      t = t.slice(1, -1).trim();
    }
    return t;
  }

  private capSummaryWords(text: string, maxWords = 80): string {
    if (!text || !text.trim()) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const words = cleaned.split(/\s+/);
    if (words.length <= maxWords) {
      return cleaned;
    }
    let lastSentenceIdx = -1;
    for (let i = Math.max(0, maxWords - 25); i < maxWords; i++) {
      if (/[.!?]$/.test(words[i])) {
        lastSentenceIdx = i;
      }
    }
    const limit = lastSentenceIdx >= 0 ? lastSentenceIdx + 1 : maxWords;
    let truncated = words
      .slice(0, limit)
      .join(' ')
      .replace(/[,;:\-–—]+$/, '')
      .replace(/\s+\b(?:and|or|with|for|in|to|by|of|across|using|including|through|while|as|a|an|the)$/i, '')
      .trim();
    if (!/[.!?]$/.test(truncated)) {
      truncated += '.';
    }
    return truncated;
  }

  private isInstructionalPhrase(text: string): boolean {
    if (!text || !text.trim()) return true;
    const t = text.trim();
    if (
      /^(?:add\s+a\s+|add\s+more\s+|include\s+a\s+|consider\s+|you\s+should\b|you\s+could\b|make\s+sure\b|ensure\s+that\b|try\s+to\b|don't\s+forget\b|be\s+sure\s+to\b|highlight\s+your\b|mention\s+your\b|emphasize\s+your\b|quantify\s+your\b|specify\s+how\b|state\s+how\b|rephrase\s+this\b|rewrite\s+this\b)/i.test(
        t
      )
    ) {
      return true;
    }
    const lower = t.toLowerCase();
    return (
      lower.includes('add a sentence') ||
      lower.includes('rephrase to') ||
      lower.includes('consider adding') ||
      lower.includes('you should mention') ||
      lower.includes('in your resume') ||
      lower.includes('in the summary section') ||
      lower.includes('to your skills section')
    );
  }

  resetStudioToOriginal(): void {
    const origCopy: StructuredResume = JSON.parse(JSON.stringify(this.originalStructured()));
    this.editableStructured.set(origCopy);
    this.appliedSuggestionCount.set(0);
    this.toast.show('Restored original resume content.');
  }

  saveStudioChanges(showToast = true): void {
    const resume = this.activeResume();
    const currentStructured = this.editableStructured();
    this.lastSavedAt.set(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    if (!resume) {
      if (showToast) {
        this.toast.show('Saved changes to Resume Generator.');
      }
      return;
    }

    this.resumeApi.saveStructuredResumeOnBackend(resume.id, currentStructured).subscribe({
      next: (saved) => {
        this.editableStructured.set(saved);
        if (showToast) {
          this.toast.show('Resume changes saved to backend.');
        }
      },
      error: () => {
        if (showToast) {
          this.toast.show('Changes saved in Resume Generator.');
        }
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
