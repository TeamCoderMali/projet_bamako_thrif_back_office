// ─── Core — Role Service ──────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ROLE_PERMISSIONS, UserRole, Permission } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authService = inject(AuthService);

  hasRole(role: UserRole | UserRole[]): boolean {
    const userRole = this.authService.userRole();
    if (!userRole) return false;
    return Array.isArray(role) ? role.includes(userRole) : userRole === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isRelayManager(): boolean {
    return this.hasRole('relay_manager');
  }
}
