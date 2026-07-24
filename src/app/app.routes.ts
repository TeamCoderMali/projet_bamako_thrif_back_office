// ─── App Routes — Bamako Thrif Admin Dashboard ────────────────────────────────
import { Routes } from '@angular/router';
import { authGuard }            from '../core/guards/auth.guard';
import { roleGuard }            from '../core/guards/role.guard';
import { AdminLayoutComponent } from '../layout/admin-layout/admin-layout.component';
import { RelayLayoutComponent } from '../layout/relay-layout/relay-layout.component';

export const routes: Routes = [
  // ── Public ────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('../features/authentication/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('../shared/pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent),
  },

  // ── Admin routes ──────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../features/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('../features/articles/list/articles-list.component').then(m => m.ArticlesListComponent),
      },
      {
        path: 'articles/:id',
        loadComponent: () =>
          import('../features/articles/detail/article-detail.component').then(m => m.ArticleDetailComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../features/users/list/users-list.component').then(m => m.UsersListComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('../features/users/detail/user-detail.component').then(m => m.UserDetailComponent),
      },
      {
        path: 'relay-centers',
        loadComponent: () =>
          import('../features/relay-centers/relay-centers.component').then(m => m.RelayCentersComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('../features/orders/orders-history.component').then(m => m.OrdersHistoryComponent),
      },
      {
        path: 'disputes',
        loadComponent: () =>
          import('../features/disputes/disputes.component').then(m => m.DisputesComponent),
      },
      {
        path: 'finances',
        loadComponent: () =>
          import('../features/finance/finance.component').then(m => m.FinanceComponent),
        data: { permissions: ['finance.view'] },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../features/reports/reports.component').then(m => m.ReportsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'admin-accounts',
        loadComponent: () =>
          import('../features/settings/admin-accounts/admin-accounts.component').then(m => m.AdminAccountsComponent),
        data: { roles: ['admin'] },
      },
    ],
  },

  // ── Relay Manager routes ───────────────────────────────────────────────────
  {
    path: 'relay',
    component: RelayLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['relay_manager'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../features/dashboard/relay-dashboard/relay-dashboard.component').then(m => m.RelayDashboardComponent),
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('../features/articles/relay/relay-articles.component').then(m => m.RelayArticlesComponent),
      },
      {
        path: 'non-conformities',
        loadComponent: () =>
          import('../features/disputes/relay/non-conformities.component').then(m => m.NonConformitiesComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('../features/reports/relay/relay-history.component').then(m => m.RelayHistoryComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../features/settings/relay/relay-profile.component').then(m => m.RelayProfileComponent),
      },
    ],
  },

  // ── Root redirect ──────────────────────────────────────────────────────────
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
