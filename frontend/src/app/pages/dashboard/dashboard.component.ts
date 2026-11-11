import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResumeApiService } from '../../services/resume.service';
import { WorkflowStateService } from '../../services/workflow-state.service';
import { ResumeRecord } from '../../models/resume.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly resumeApi = inject(ResumeApiService);
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.resumeApi.loadResumes();
  }

  scanResumeForFree(): void {
    this.router.navigate(['/resume-analyzer']);
  }

  openResumeInAnalyzer(record: ResumeRecord): void {
    this.state.setActiveResume(record);
    this.router.navigate(['/resume-analyzer']);
  }
}
