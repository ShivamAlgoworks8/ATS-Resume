import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  private readonly router = inject(Router);
  readonly toast = inject(ToastService);
  pageTitle = 'Dashboard';

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const path = this.router.url.split('/')[1];
      this.pageTitle = ({ dashboard: 'Dashboard', 'create-resume': 'Create Resume', 'my-resumes': 'My Resumes', 'analysis-history': 'Analysis History', 'saved-jds': 'Saved JDs' } as Record<string, string>)[path] ?? 'Dashboard';
    });
  }
}
