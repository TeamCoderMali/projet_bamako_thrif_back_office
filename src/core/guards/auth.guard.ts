// ─── Core — Auth Guard (réactif) ─────────────────────────────────────────────
// Attend que Firebase Auth finisse de restaurer la session (isLoading = false)
// avant de décider si l'utilisateur est authentifié.
// Sans ce fix, un rafraîchissement de page déconnecte l'utilisateur car le guard
// tourne avant que onAuthStateChanged ait répondu.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Si Firebase a déjà fini de s'initialiser, décision immédiate
  if (!auth.isLoading()) {
    return auth.isAuthenticated()
      ? true
      : router.createUrlTree(['/login']);
  }

  // Sinon, on attend le premier signal où isLoading devient false
  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),   // attendre la fin de l'initialisation Firebase
    take(1),                        // ne prendre qu'une seule valeur
    map(() =>
      auth.isAuthenticated()
        ? true
        : router.createUrlTree(['/login'])
    )
  );
};
