import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-my-resumes', standalone: true, imports: [RouterLink], templateUrl: './my-resumes.html' })
export class MyResumesComponent { readonly toastService = inject(ToastService); }
