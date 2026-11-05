import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');
  private timeout?: number;

  show(message: string): void {
    this.message.set(message);
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => this.message.set(''), 3200);
  }
}
