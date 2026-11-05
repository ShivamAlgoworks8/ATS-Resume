import { Routes } from '@angular/router';
import { CreateResumeComponent } from './pages/create-resume/create-resume.component';
import { MyResumesComponent } from './pages/my-resumes/my-resumes.component';
import { AnalysisHistoryComponent } from './pages/analysis-history/analysis-history.component';
import { SavedJdsComponent } from './pages/saved-jds/saved-jds.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: CreateResumeComponent },
  { path: 'create-resume', component: CreateResumeComponent },
  { path: 'my-resumes', component: MyResumesComponent },
  { path: 'analysis-history', component: AnalysisHistoryComponent },
  { path: 'saved-jds', component: SavedJdsComponent },
  { path: '**', redirectTo: 'dashboard' },
];
