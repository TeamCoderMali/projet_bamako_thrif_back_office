import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauth">
      <span class="material-icons icon">lock</span>
      <h1>Accès refusé</h1>
      <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <button (click)="goBack()">Retour</button>
    </div>
  `,
  styles: [`
    .unauth {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 16px; background: #f9fafb; text-align: center; padding: 24px;
    }
    .icon { font-size: 64px !important; color: #dc2626; }
    h1    { font-size: 24px; font-weight: 700; color: #0f1117; margin: 0; }
    p     { color: #6b7280; font-size: 14px; margin: 0; max-width: 360px; }
    button {
      background: #6B7F4D; color: #fff; border: none;
      padding: 10px 24px; border-radius: 8px; cursor: pointer;
      font-size: 14px; font-weight: 600;
      &:hover { background: #5a6b3e; }
    }
  `]
})
export class UnauthorizedComponent {
  private auth = inject(AuthService);
  goBack(): void { this.auth.redirectAfterLogin(this.auth.userRole() ?? ''); }
}
