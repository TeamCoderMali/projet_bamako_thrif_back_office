import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          <span class="material-icons toast__icon">{{ iconFor(toast) }}</span>
          <span class="toast__msg">{{ toast.message }}</span>
          <button class="toast__close material-icons" (click)="toastService.dismiss(toast.id)">close</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast--success { background: #dcfce7; color: #15803d; border-left: 4px solid #16a34a; }
    .toast--error   { background: #fee2e2; color: #dc2626; border-left: 4px solid #dc2626; }
    .toast--warning { background: #fef9c3; color: #a16207; border-left: 4px solid #ca8a04; }
    .toast--info    { background: #dbeafe; color: #1d4ed8; border-left: 4px solid #2563eb; }
    .toast__msg { flex: 1; }
    .toast__icon, .toast__close { font-size: 18px !important; }
    .toast__close { background: none; border: none; cursor: pointer; color: inherit; padding: 0; }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  iconFor(toast: Toast): string {
    const icons: Record<string, string> = {
      success: 'check_circle', error: 'error', warning: 'warning', info: 'info'
    };
    return icons[toast.type] ?? 'info';
  }
}
