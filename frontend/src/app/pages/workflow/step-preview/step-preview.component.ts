import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlgoworksResumeComponent } from '../../../shared/algoworks-resume/algoworks-resume.component';
import { WorkflowStateService } from '../../../services/workflow-state.service';

@Component({
  selector: 'app-step-preview',
  standalone: true,
  imports: [AlgoworksResumeComponent],
  templateUrl: './step-preview.component.html',
})
export class StepPreviewComponent {
  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);

  printOrSaveBrowserPdf(): void {
    window.print();
  }

  returnToGenerator(): void {
    this.router.navigate(['/resume-generator']);
  }
}
