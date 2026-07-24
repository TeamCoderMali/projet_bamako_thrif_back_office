// ─── Core — RBAC Models ──────────────────────────────────────────────────────
export type UserRole = 'admin' | 'relay_manager';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  relayCenterId?: string; // for relay_manager only
  photoURL?: string;
  createdAt: Date;
}

export type Permission =
  // articles
  | 'articles.view_all'
  | 'articles.view_own'
  | 'articles.create'
  | 'articles.edit'
  | 'articles.delete'
  | 'articles.update_status'
  | 'articles.flag'
  | 'articles.comment'
  | 'articles.upload_photo'
  // users
  | 'users.view'
  | 'users.edit'
  | 'users.ban'
  | 'users.delete'
  // relay centers
  | 'relay_centers.view'
  | 'relay_centers.create'
  | 'relay_centers.edit'
  | 'relay_centers.delete'
  // finances
  | 'finance.view'
  | 'finance.export'
  // disputes
  | 'disputes.view'
  | 'disputes.resolve'
  | 'disputes.close'
  // reports
  | 'reports.view'
  | 'reports.export'
  // settings
  | 'settings.view'
  | 'settings.edit'
  // dashboard
  | 'dashboard.global'
  | 'dashboard.relay';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'articles.view_all', 'articles.create', 'articles.edit', 'articles.delete',
    'articles.update_status', 'articles.flag', 'articles.comment', 'articles.upload_photo',
    'users.view', 'users.edit', 'users.ban', 'users.delete',
    'relay_centers.view', 'relay_centers.create', 'relay_centers.edit', 'relay_centers.delete',
    'finance.view', 'finance.export',
    'disputes.view', 'disputes.resolve', 'disputes.close',
    'reports.view', 'reports.export',
    'settings.view', 'settings.edit',
    'dashboard.global', 'dashboard.relay',
  ],
  relay_manager: [
    'articles.view_own', 'articles.update_status', 'articles.flag',
    'articles.comment', 'articles.upload_photo',
    'relay_centers.view',
    'dashboard.relay',
  ],
};
