import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly links = [
    { label: 'Dashboard', icon: '▦', path: '/dashboard' },
    { label: 'Create Resume', icon: '◉', path: '/create-resume' },
    { label: 'My Resumes', icon: '▤', path: '/my-resumes' },
    { label: 'Analysis History', icon: '◷', path: '/analysis-history' },
    { label: 'Saved JDs', icon: '▱', path: '/saved-jds' },
  ];
}
