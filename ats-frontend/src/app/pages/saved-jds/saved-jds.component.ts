import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-saved-jds', standalone: true, imports: [RouterLink], templateUrl: './saved-jds.html' })
export class SavedJdsComponent { readonly toastService = inject(ToastService); }
