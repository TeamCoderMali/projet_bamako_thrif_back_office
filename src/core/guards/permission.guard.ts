// ─── Core — Permission Guard ──────────────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../services/permission.service';
import { Permission } from '../auth/auth.models';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const permService = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const required: Permission[] = route.data['permissions'] ?? [];
  if (required.length === 0) return true;

  return permService.hasAnyPermission(required)
    ? true
    : router.createUrlTree(['/unauthorized']);
};
