import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ToastContainerComponent } from '../../../shared/components/confirm-dialog/toast-container.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastContainerComponent],
  template: `
    <div class="login-shell">
      <div class="login-card">
        <!-- Logo -->
        <div class="login-header">
          <img src="/logo_danaya.png" alt="DANAYA" class="login-logo" />
          <h1 class="login-title">DANAYA</h1>
          <p class="login-sub">Back Office · Administration</p>
        </div>

        <!-- Form -->
        <form (ngSubmit)="submit()" class="login-form">
          <div class="field">
            <label>Adresse email</label>
            <input type="email" [(ngModel)]="email" name="email"
                   placeholder="admin@danaya.ml" required autocomplete="email" />
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <div class="input-wrap">
              <input [type]="showPwd() ? 'text' : 'password'"
                     [(ngModel)]="password" name="password"
                     placeholder="••••••••" required />
              <button type="button" class="eye-btn" (click)="togglePwd()">
                <span class="material-icons">{{ showPwd() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="login-error">
              <span class="material-icons">error_outline</span>
              {{ error() }}
            </div>
          }

          <button type="submit" class="btn-login" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> }
            @else            { <span class="material-icons">login</span> }
            {{ loading() ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <p class="login-footer">
          Accès réservé aux administrateurs DANAYA.
        </p>
      </div>
    </div>
    <app-toast-container />
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  email    = '';
  password = '';
  loading   = signal(false);
  error     = signal('');
  showPwd   = signal(false);

  togglePwd(): void { this.showPwd.update(v => !v); }

  async submit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.login(this.email, this.password);
      this.toastService.success('Connexion réussie');
    } catch (e: any) {
      this.error.set(this.formatError(e.code ?? e.message));
    } finally {
      this.loading.set(false);
    }
  }

  private formatError(code: string): string {
    const messages: Record<string, string> = {
      'auth/wrong-password':    'Mot de passe incorrect.',
      'auth/user-not-found':    'Aucun compte pour cet email.',
      'auth/invalid-credential':'Email ou mot de passe invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    };
    return messages[code] ?? 'Une erreur est survenue. Réessayez.';
  }
}
