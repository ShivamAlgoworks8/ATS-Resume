import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ResumeApiService } from '../../services/resume.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly resumeApi = inject(ResumeApiService);
  pageTitle = 'Dashboard';

  private readonly routeNames: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/resume-analyzer': 'Resume Analyzer',
    '/analysis-results': 'Analysis Results',
    '/detailed-report': 'Detailed ATS Report',
    '/resume-generator': 'Resume Generator',
    '/my-analyses': 'My Analyses',
    '/my-resumes': 'My Resumes',
    '/templates': 'Templates',
  };

  constructor() {
    const router = inject(Router);
    this.updateTitle(router.url);

    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateTitle(event.urlAfterRedirects);
      });
  }

  private updateTitle(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.pageTitle = this.routeNames[cleanUrl] ?? 'Dashboard';
  }
}
