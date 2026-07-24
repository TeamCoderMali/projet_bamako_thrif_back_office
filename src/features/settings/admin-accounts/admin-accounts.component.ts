// ─── Admin Accounts Page ──────────────────────────────────────────────────────
// Permet à un admin de : lister, créer et supprimer des comptes administrateurs.
// Contrainte : impossible de supprimer son propre compte.
// Création via une instance Firebase secondaire (ne déconnecte pas l'admin actuel).

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut as fbSignOut } from 'firebase/auth';
import {
  Firestore,
  collection, collectionData,
  doc, setDoc, deleteDoc, Timestamp,
} from '@angular/fire/firestore';
import { AuthService }     from '../../../core/auth/auth.service';
import { ToastService }    from '../../../core/services/toast.service';
import { PageHeaderComponent }   from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }  from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { Observable } from 'rxjs';

interface AdminAccount {
  uid:         string;
  email:       string;
  displayName: string;
  role:        'admin' | 'relay_manager';
  isActive:    boolean;
  createdAt:   any;
}

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyBWL6eifzR4QmaPH7vh5oxsJ9ExXKlXyjw',
  authDomain:        'bamako-thrif.firebaseapp.com',
  projectId:         'bamako-thrif',
  storageBucket:     'bamako-thrif.firebasestorage.app',
  messagingSenderId: '84148343844',
  appId:             '1:84148343844:web:9a6c388d7ab37e558834b1',
};

@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent,
  ],
  template: `
    <app-page-header
      title="Comptes Administrateurs"
      subtitle="Créer, consulter et supprimer les accès au dashboard" />

    <!-- ── Actions ──────────────────────────────────────────────────────── -->
    <div class="toolbar">
      <button class="btn btn--primary" (click)="showForm.set(!showForm())">
        <span class="material-icons">{{ showForm() ? 'close' : 'add' }}</span>
        {{ showForm() ? 'Annuler' : 'Nouveau compte' }}
      </button>
    </div>

    <!-- ── Formulaire de création ─────────────────────────────────────── -->
    @if (showForm()) {
      <div class="create-card">
        <h3 class="create-card__title">
          <span class="material-icons">admin_panel_settings</span>
          Créer un compte administrateur
        </h3>

        <div class="form-grid">
          <div class="field">
            <label>Nom complet *</label>
            <input type="text" [(ngModel)]="form.displayName"
                   placeholder="Marie Koné" [disabled]="creating()" />
          </div>
          <div class="field">
            <label>Adresse email *</label>
            <input type="email" [(ngModel)]="form.email"
                   placeholder="marie@danaya.ml" [disabled]="creating()" />
          </div>
          <div class="field">
            <label>Mot de passe *</label>
            <div class="input-wrap">
              <input [type]="showPwd() ? 'text' : 'password'"
                     [(ngModel)]="form.password"
                     placeholder="8 caractères minimum" [disabled]="creating()" />
              <button type="button" class="eye-btn" (click)="togglePwd()">
                <span class="material-icons">{{ showPwd() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>
          <div class="field">
            <label>Rôle *</label>
            <select [(ngModel)]="form.role" [disabled]="creating()">
              <option value="admin">👑 Admin (accès complet)</option>
              <option value="relay_manager">🏪 Gestionnaire de relais</option>
            </select>
          </div>
        </div>

        @if (formError()) {
          <div class="form-error">
            <span class="material-icons">error_outline</span>
            {{ formError() }}
          </div>
        }

        <div class="form-actions">
          <button class="btn btn--ghost" (click)="resetForm()" [disabled]="creating()">
            Réinitialiser
          </button>
          <button class="btn btn--primary" (click)="createAccount()" [disabled]="creating()">
            @if (creating()) { <span class="spinner"></span> Création... }
            @else             { <span class="material-icons">person_add</span> Créer le compte }
          </button>
        </div>
      </div>
    }

    <!-- ── Liste des admins ──────────────────────────────────────────── -->
    <div class="table-card">
      <div class="table-header">
        <h3 class="table-header__title">Comptes enregistrés</h3>
        <span class="table-header__count">{{ admins().length }} compte(s)</span>
      </div>

      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1,2,3]; track i) {
            <app-skeleton-loader height="56px" />
          }
        </div>
      } @else if (admins().length === 0) {
        <div class="empty-state">
          <span class="material-icons">admin_panel_settings</span>
          <p>Aucun compte administrateur trouvé.</p>
        </div>
      } @else {
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (admin of admins(); track admin.uid) {
              <tr [class.is-me]="admin.uid === currentUid()">
                <td>
                  <div class="user-cell">
                    <div class="user-cell__avatar">{{ initials(admin.displayName) }}</div>
                    <span class="user-cell__name">
                      {{ admin.displayName }}
                      @if (admin.uid === currentUid()) {
                        <span class="me-badge">Vous</span>
                      }
                    </span>
                  </div>
                </td>
                <td class="text-muted">{{ admin.email }}</td>
                <td>
                  <span class="role-badge" [class.role-badge--admin]="admin.role === 'admin'"
                        [class.role-badge--relay]="admin.role === 'relay_manager'">
                    {{ admin.role === 'admin' ? '👑 Admin' : '🏪 Relais' }}
                  </span>
                </td>
                <td>
                  <app-status-badge [status]="admin.isActive ? 'active' : 'inactive'" />
                </td>
                <td class="text-muted">{{ formatDate(admin.createdAt) }}</td>
                <td>
                  @if (admin.uid !== currentUid()) {
                    <button class="btn-icon btn-icon--danger"
                            (click)="confirmDelete(admin)"
                            title="Supprimer ce compte">
                      <span class="material-icons">delete_outline</span>
                    </button>
                  } @else {
                    <span class="text-muted" style="font-size:12px">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- ── Confirm Dialog ────────────────────────────────────────────── -->
    @if (confirmTarget()) {
      <div class="overlay" (click)="confirmTarget.set(null)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <span class="material-icons dialog__icon">warning</span>
          <h3>Supprimer ce compte ?</h3>
          <p>Le compte <strong>{{ confirmTarget()?.displayName }}</strong>
            ({{ confirmTarget()?.email }}) n'aura plus accès au dashboard.</p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="confirmTarget.set(null)">Annuler</button>
            <button class="btn btn--danger" (click)="deleteAccount(confirmTarget()!)" [disabled]="deleting()">
              @if (deleting()) { <span class="spinner spinner--white"></span> }
              Supprimer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './admin-accounts.component.scss'
})
export class AdminAccountsComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private toast: ToastService = inject(ToastService);

  // ── State ─────────────────────────────────────────────────────────────────
  admins       = signal<AdminAccount[]>([]);
  loading      = signal(true);
  showForm     = signal(false);
  creating     = signal(false);
  deleting     = signal(false);
  formError    = signal('');
  showPwd      = signal(false);
  confirmTarget = signal<AdminAccount | null>(null);

  currentUid = this.authService.currentUser
    ? (() => { const u = this.authService.currentUser(); return u?.uid ?? ''; })
    : signal('');

  form = { displayName: '', email: '', password: '', role: 'admin' as 'admin' | 'relay_manager' };

  // ── Load admins from Firestore ─────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    try {
      const { getDocs, collection: col } = await import('@angular/fire/firestore');
      const snap = await getDocs(col(this.firestore, 'admin_users'));
      const list: AdminAccount[] = snap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminAccount));
      list.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      this.admins.set(list);
    } catch (e) {
      this.toast.error('Impossible de charger la liste des admins');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Create new admin account ───────────────────────────────────────────────
  async createAccount(): Promise<void> {
    const { displayName, email, password, role } = this.form;
    this.formError.set('');

    if (!displayName.trim()) { this.formError.set('Le nom complet est obligatoire.'); return; }
    if (!email.trim())       { this.formError.set('L\'email est obligatoire.'); return; }
    if (password.length < 6) { this.formError.set('Le mot de passe doit faire au moins 6 caractères.'); return; }

    this.creating.set(true);

    try {
      // Utilise une instance Firebase secondaire pour ne pas déconnecter l'admin actuel
      const SECONDARY = 'danaya-admin-create';
      const existingApps = getApps();
      const secondaryExists = existingApps.find(a => a.name === SECONDARY);
      if (secondaryExists) await deleteApp(secondaryExists);

      const secondaryApp  = initializeApp(FIREBASE_CONFIG, SECONDARY);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Créer l'utilisateur Auth
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid  = cred.user.uid;
      await updateProfile(cred.user, { displayName });
      await fbSignOut(secondaryAuth);
      await deleteApp(secondaryApp);

      // 2. Créer le document Firestore
      const { setDoc: sd, doc: d } = await import('@angular/fire/firestore');
      await sd(d(this.firestore, 'admin_users', uid), {
        uid,
        email,
        displayName,
        role,
        isActive:  true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 3. Mettre à jour la liste locale
      const newAdmin: AdminAccount = {
        uid, email, displayName, role, isActive: true, createdAt: Timestamp.now(),
      };
      this.admins.update(list => [...list, newAdmin]);

      this.toast.success(`Compte "${displayName}" créé avec succès`);
      this.resetForm();
      this.showForm.set(false);

    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé.',
        'auth/invalid-email':        'Email invalide.',
        'auth/weak-password':        'Mot de passe trop faible (6 caractères min).',
      };
      this.formError.set(msgs[err.code] ?? `Erreur : ${err.message}`);
    } finally {
      this.creating.set(false);
    }
  }

  // ── Delete admin account ───────────────────────────────────────────────────
  async deleteAccount(admin: AdminAccount): Promise<void> {
    if (admin.uid === this.authService.currentUser()?.uid) {
      this.toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }

    this.deleting.set(true);
    try {
      const { deleteDoc: dd, doc: d } = await import('@angular/fire/firestore');
      await dd(d(this.firestore, 'admin_users', admin.uid));
      this.admins.update(list => list.filter(a => a.uid !== admin.uid));
      this.confirmTarget.set(null);
      this.toast.success(`Compte "${admin.displayName}" supprimé`);
    } catch {
      this.toast.error('Impossible de supprimer ce compte.');
    } finally {
      this.deleting.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  confirmDelete(admin: AdminAccount): void { this.confirmTarget.set(admin); }
  resetForm(): void { this.form = { displayName: '', email: '', password: '', role: 'admin' }; this.formError.set(''); }
  togglePwd(): void { this.showPwd.update(v => !v); }

  initials(name: string): string {
    return (name ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  }
}
