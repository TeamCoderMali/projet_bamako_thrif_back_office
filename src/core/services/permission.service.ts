// ─── Core — Permission Service ────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ROLE_PERMISSIONS, Permission } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private authService = inject(AuthService);

  hasPermission(permission: Permission | Permission[]): boolean {
    const role = this.authService.userRole();
    if (!role) return false;
    const userPerms = ROLE_PERMISSIONS[role] ?? [];
    return Array.isArray(permission)
      ? permission.every(p => userPerms.includes(p))
      : userPerms.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    const role = this.authService.userRole();
    if (!role) return false;
    const userPerms = ROLE_PERMISSIONS[role] ?? [];
    return permissions.some(p => userPerms.includes(p));
  }

  getUserPermissions(): Permission[] {
    const role = this.authService.userRole();
    if (!role) return [];
    return ROLE_PERMISSIONS[role] ?? [];
  }
}
