import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastContainerComponent } from '../../shared/components/confirm-dialog/toast-container.component';

@Component({
  selector: 'app-relay-layout',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, RouterLink, RouterLinkActive, ToastContainerComponent],
  template: `
    <div class="shell relay-shell">
      <aside class="sidebar">
        <div class="sidebar__logo">
          <img src="/logo_danaya.png" alt="DANAYA" class="logo-img" />
          <div>
            <span class="logo-text">DANAYA</span>
            <span class="logo-badge relay">Relais</span>
          </div>
        </div>

        <nav class="sidebar__nav">
          @for (item of navItems; track item.route) {
            <a class="nav-item"
               [routerLink]="item.route"
               routerLinkActive="nav-item--active"
               [title]="item.label">
              <span class="material-icons nav-item__icon">{{ item.icon }}</span>
              <span class="nav-item__label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          <div class="user-info">
            <div class="user-avatar relay-avatar">{{ userInitials() }}</div>
            <div class="user-details">
              <p class="user-name">{{ currentUser()?.displayName }}</p>
              <p class="user-role">Point Relais</p>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()">
            <span class="material-icons">logout</span>
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <h2 class="topbar__title">Point Relais</h2>
          <div class="topbar__right">
            <span class="topbar__time">{{ now | date:'d MMM · HH:mm' }}</span>
          </div>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-toast-container />
  `,
  styleUrl: './relay-layout.component.scss'
})
export class RelayLayoutComponent {
  private authService: AuthService = inject(AuthService);
  now = new Date();

  currentUser = this.authService.currentUser;

  navItems = [
    { label: 'Dashboard',        icon: 'dashboard',      route: '/relay/dashboard' },
    { label: 'Articles',         icon: 'inventory_2',    route: '/relay/articles' },
    { label: 'Non-conformités',  icon: 'report_problem', route: '/relay/non-conformities' },
    { label: 'Historique',       icon: 'history',        route: '/relay/history' },
    { label: 'Mon profil',       icon: 'person',         route: '/relay/profile' },
  ];

  userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'R';
    return (user.displayName ?? 'Relais')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  logout(): void { this.authService.logout(); }
}
