import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkflowStepId } from '../../models/resume.models';
import { WorkflowStateService } from '../../services/workflow-state.service';
import { ToastService } from '../../services/toast.service';

export interface StepDefinition {
  id: WorkflowStepId;
  number: number;
  title: string;
  subtitle: string;
  route: string;
}

@Component({
  selector: 'app-workflow-stepper',
  standalone: true,
  templateUrl: './workflow-stepper.component.html',
})
export class WorkflowStepperComponent {
  @Input({ required: true }) activeStep!: WorkflowStepId;

  readonly state = inject(WorkflowStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly steps: StepDefinition[] = [
    {
      id: 'upload',
      number: 1,
      title: 'Upload Resume & JD',
      subtitle: 'Files & target role',
      route: '/workflow/upload',
    },
    {
      id: 'analysis',
      number: 2,
      title: 'ATS Score & Analysis',
      subtitle: 'Match breakdown',
      route: '/workflow/analysis',
    },
    {
      id: 'suggestions',
      number: 3,
      title: 'AI Suggestions',
      subtitle: 'Approve improvements',
      route: '/workflow/suggestions',
    },
    {
      id: 'studio',
      number: 4,
      title: 'Editing Studio',
      subtitle: 'Full manual control',
      route: '/workflow/studio',
    },
    {
      id: 'preview',
      number: 5,
      title: 'LaTeX & PDF Export',
      subtitle: 'Preview & download',
      route: '/workflow/preview',
    },
  ];

  isCompleted(stepId: WorkflowStepId): boolean {
    const order: WorkflowStepId[] = ['upload', 'analysis', 'suggestions', 'studio', 'preview'];
    return order.indexOf(stepId) < order.indexOf(this.activeStep);
  }

  navigateToStep(step: StepDefinition): void {
    if (step.id === 'analysis' || step.id === 'suggestions') {
      if (!this.state.hasAnalysis()) {
        this.toast.show('Run ATS Analysis in Step 1 first to view analysis & suggestions.');
        return;
      }
    }
    this.router.navigate([step.route]);
  }
}

