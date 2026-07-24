// ─── Root App Component ───────────────────────────────────────────────────────
// Affiche un splash screen pendant l'initialisation de Firebase Auth.
// Cela évite le flash blanc et la redirection erronée lors d'un rafraîchissement.

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    @if (authService.isLoading()) {
      <!-- Splash screen pendant l'init Firebase -->
      <div class="splash">
        <div class="splash__content">
          <img src="/logo_danaya.png" alt="DANAYA" class="splash__logo"
               onerror="this.style.display='none'" />
          <div class="splash__brand">DANAYA</div>
          <div class="splash__subtitle">Back Office</div>
          <div class="splash__spinner">
            <div class="splash__dot"></div>
            <div class="splash__dot"></div>
            <div class="splash__dot"></div>
          </div>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .splash {
      position: fixed; inset: 0;
      background: #0f1117;
      display: flex; align-items: center; justify-content: center;
      z-index: 99999;
    }
    .splash__content {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      animation: fadeInUp 0.4s ease;
    }
    .splash__logo {
      width: 72px; height: 72px; border-radius: 16px; object-fit: contain;
      box-shadow: 0 8px 32px rgba(107, 127, 77, 0.3);
    }
    .splash__brand {
      font-size: 28px; font-weight: 800; color: #fff;
      letter-spacing: 0.05em;
      font-family: 'Inter', sans-serif;
    }
    .splash__subtitle {
      font-size: 13px; color: rgba(255,255,255,0.4);
      font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;
      margin-top: -6px;
    }
    .splash__spinner {
      display: flex; gap: 6px; margin-top: 16px;
    }
    .splash__dot {
      width: 8px; height: 8px; border-radius: 50%; background: #6B7F4D;
      animation: bounce 1.2s infinite ease-in-out;
      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.15s; }
      &:nth-child(3) { animation-delay: 0.3s; }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40%            { transform: scale(1);   opacity: 1; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class App {
  authService: AuthService = inject(AuthService);
}
