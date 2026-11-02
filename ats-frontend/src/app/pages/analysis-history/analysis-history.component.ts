import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-analysis-history', standalone: true, imports: [RouterLink], templateUrl: './analysis-history.html' })
export class AnalysisHistoryComponent { readonly toastService = inject(ToastService); }
