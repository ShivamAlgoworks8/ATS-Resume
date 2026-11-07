import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'analyzer' | 'analyses' | 'generator' | 'resumes' | 'templates';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Resume Analyzer', path: '/resume-analyzer', icon: 'analyzer' },
    { label: 'My Analyses', path: '/my-analyses', icon: 'analyses' },
    { label: 'Resume Generator', path: '/resume-generator', icon: 'generator' },
    { label: 'My Resumes', path: '/my-resumes', icon: 'resumes' },
    { label: 'Templates', path: '/templates', icon: 'templates' },
  ];
}
