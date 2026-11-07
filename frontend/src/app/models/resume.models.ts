export type ProcessingStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type WorkflowStepId = 'upload' | 'analysis' | 'suggestions' | 'studio' | 'preview';

export interface ResumeRecord {
  id: string;
  originalFileName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
  uploadDate: string;
  processingStatus: ProcessingStatus;
}

export interface ResumeMetadataUpdatePayload {
  originalFileName?: string;
  fileName?: string;
}

export interface AtsAnalysisRequest {
  resumeId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
}

export interface SectionEvaluation {
  sectionName: string;
  status: 'STRONG' | 'MODERATE' | 'NEEDS_WORK' | 'MISSING';
  score: number;
  summary: string;
  details: string[];
}

export interface ReadabilityCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AtsAnalysisResponse {
  analysisId: string;
  resumeId: string;
  jobTitle: string;
  companyName: string;
  analyzedAt: string;
  isMockPreview: boolean;
  overallScore: number;
  skillsMatchPercentage: number;
  experienceRelevance: number;
  educationRelevance: number;
  formattingScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  relevantSkills: string[];
  extraOrLessRelevantTerms: string[];
  sectionEvaluations: SectionEvaluation[];
  readabilityChecks: ReadabilityCheck[];
  executiveSummary: string;
  suggestions: ResumeSuggestion[];
}

export type SuggestionCategory =
  | 'MISSING_SKILLS'
  | 'MISSING_KEYWORDS'
  | 'SUMMARY_IMPROVEMENTS'
  | 'EXPERIENCE_IMPROVEMENTS'
  | 'PROJECT_IMPROVEMENTS'
  | 'ACHIEVEMENTS_METRICS'
  | 'FORMATTING_IMPROVEMENTS'
  | 'CONTENT_REMOVAL';

export type SuggestionDecision = 'PENDING' | 'APPROVED' | 'SKIPPED';

export interface ResumeSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  targetSection: string;
  currentIssue: string;
  reason: string;
  suggestedChange: string;
  requiresCandidateVerification: boolean;
  decision: SuggestionDecision;
}

export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface SkillCategoryGroup {
  id: string;
  categoryName: string;
  skills: string[];
}

export interface WorkExperienceItem {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  aiModified?: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  technologies: string;
  link: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  aiModified?: boolean;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  gradeOrHonors: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  issuerOrContext: string;
  date: string;
  description: string;
  aiModified?: boolean;
}

export interface StructuredResume {
  contact: ContactInfo;
  professionalSummary: string;
  summaryAiModified?: boolean;
  skillCategories: SkillCategoryGroup[];
  experience: WorkExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  achievements: AchievementItem[];
}

export interface OptimizeResumeRequest {
  resumeId: string;
  approvedSuggestionIds: string[];
  jobDescription: string;
}

export interface SavedJobDescription {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  workplaceType: string;
  savedDate: string;
  keySkills: string[];
  descriptionText: string;
  isMockData?: boolean;
}

export interface AnalysisHistoryRecord {
  id: string;
  resumeId: string;
  resumeFileName: string;
  jobTitle: string;
  companyName: string;
  analyzedDate: string;
  overallScore: number;
  scoreDelta: string;
  status: 'Completed' | 'Draft';
  isMockData?: boolean;
}
