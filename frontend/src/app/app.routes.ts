import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StepUploadComponent } from './pages/workflow/step-upload/step-upload.component';
import { StepAnalysisComponent } from './pages/workflow/step-analysis/step-analysis.component';
import { StepSuggestionsComponent } from './pages/workflow/step-suggestions/step-suggestions.component';
import { StepStudioComponent } from './pages/workflow/step-studio/step-studio.component';
import { StepPreviewComponent } from './pages/workflow/step-preview/step-preview.component';
import { MyResumesComponent } from './pages/my-resumes/my-resumes.component';
import { AnalysisHistoryComponent } from './pages/analysis-history/analysis-history.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'resume-analyzer', component: StepUploadComponent },
  { path: 'analysis-results', component: StepAnalysisComponent },
  { path: 'detailed-report', component: StepSuggestionsComponent },
  { path: 'resume-generator', component: StepStudioComponent },
  { path: 'my-analyses', component: AnalysisHistoryComponent },
  { path: 'my-resumes', component: MyResumesComponent },
  { path: 'templates', component: StepPreviewComponent },

  // Legacy redirects
  { path: 'create-resume', redirectTo: 'resume-analyzer', pathMatch: 'full' },
  { path: 'workflow/upload', redirectTo: 'resume-analyzer', pathMatch: 'full' },
  { path: 'workflow/analysis', redirectTo: 'analysis-results', pathMatch: 'full' },
  { path: 'workflow/suggestions', redirectTo: 'detailed-report', pathMatch: 'full' },
  { path: 'workflow/studio', redirectTo: 'resume-generator', pathMatch: 'full' },
  { path: 'workflow/preview', redirectTo: 'templates', pathMatch: 'full' },
  { path: 'analysis-history', redirectTo: 'my-analyses', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
