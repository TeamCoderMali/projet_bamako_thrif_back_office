import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastContainerComponent } from '../../shared/components/confirm-dialog/toast-container.component';

interface NavItem {
  label: string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, RouterLink, RouterLinkActive, ToastContainerComponent],
  template: `
    <div class="shell" [class.sidebar-collapsed]="collapsed()">
      <!-- ── Sidebar ──────────────────────────────────────────────── -->
      <aside class="sidebar">
        <div class="sidebar__logo">
          <img src="/logo_danaya.png" alt="DANAYA" class="logo-img" />
          <span class="logo-text">DANAYA</span>
          <span class="logo-badge">Admin</span>
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
            <div class="user-avatar">{{ userInitials() }}</div>
            <div class="user-details">
              <p class="user-name">{{ currentUser()?.displayName }}</p>
              <p class="user-role">Administrateur</p>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()" title="Déconnexion">
            <span class="material-icons">logout</span>
          </button>
        </div>
      </aside>

      <!-- ── Main ─────────────────────────────────────────────────── -->
      <div class="main">
        <header class="topbar">
          <button class="topbar__toggle" (click)="toggleSidebar()">
            <span class="material-icons">menu</span>
          </button>
          <div class="topbar__right">
            <span class="topbar__time">{{ now | date:'HH:mm · d MMM yyyy' }}</span>
            <button class="topbar__notif">
              <span class="material-icons">notifications_none</span>
            </button>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-toast-container />
  `,
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  private authService: AuthService = inject(AuthService);
  collapsed   = signal(false);
  now         = new Date();

  currentUser = this.authService.currentUser;

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',            route: '/admin/dashboard' },
    { label: 'Articles',        icon: 'checkroom',            route: '/admin/articles' },
    { label: 'Utilisateurs',    icon: 'group',                route: '/admin/users' },
    { label: 'Points relais',   icon: 'store',                route: '/admin/relay-centers' },
    { label: 'Historique',      icon: 'history',              route: '/admin/history' },
    { label: 'Finances',        icon: 'account_balance',      route: '/admin/finances' },
    { label: 'Litiges',         icon: 'gavel',                route: '/admin/disputes' },
    { label: 'Statistiques',    icon: 'bar_chart',            route: '/admin/reports' },
    { label: 'Paramètres',      icon: 'settings',             route: '/admin/settings' },
    { label: 'Comptes Admin',   icon: 'admin_panel_settings', route: '/admin/admin-accounts' },
  ];

  toggleSidebar(): void { this.collapsed.update(v => !v); }

  userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'A';
    return (user.displayName ?? 'Admin')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  logout(): void { this.authService.logout(); }
}
