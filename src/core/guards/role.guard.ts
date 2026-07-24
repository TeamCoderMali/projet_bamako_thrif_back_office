// ─── Core — Role Guard (réactif) ─────────────────────────────────────────────
// Attend aussi la fin de l'init Firebase avant de vérifier le rôle.
// Sans ce fix, le rôle est null au rafraîchissement → redirection /unauthorized.

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const checkRole = () => {
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    const requiredRoles: UserRole[] = route.data['roles'] ?? [];
    const userRole = auth.userRole();
    if (requiredRoles.length === 0 || (userRole && requiredRoles.includes(userRole))) {
      return true;
    }
    return router.createUrlTree(['/unauthorized']);
  };

  // Si Firebase est déjà initialisé → décision immédiate
  if (!auth.isLoading()) {
    return checkRole();
  }

  // Sinon, attendre la fin de l'initialisation
  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => checkRole())
  );
};
