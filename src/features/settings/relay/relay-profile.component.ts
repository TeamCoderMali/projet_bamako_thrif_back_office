import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, getDoc, updateDoc, Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface RelayProfile { displayName: string; email: string; phone?: string; city?: string; relayName?: string; }

@Component({
  selector: 'app-relay-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Mon Profil" subtitle="Informations de votre compte gestionnaire relais" />

    <div class="profile-grid">
      <!-- Avatar -->
      <div class="avatar-card">
        <div class="avatar">{{ initials() }}</div>
        <h3 class="avatar-name">{{ profile().displayName }}</h3>
        <p class="avatar-email">{{ profile().email }}</p>
        <span class="role-badge">🏪 Gestionnaire Relais</span>
      </div>

      <!-- Edit form -->
      <div class="form-card">
        <h3 class="form-card__title">Modifier mes informations</h3>
        <div class="form-grid">
          <div class="field span2">
            <label>Nom complet</label>
            <input type="text" [(ngModel)]="profile().displayName" (ngModelChange)="changed.set(true)" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input type="tel" [(ngModel)]="profile().phone" placeholder="+223 70 00 00 00" (ngModelChange)="changed.set(true)" />
          </div>
          <div class="field">
            <label>Ville</label>
            <input type="text" [(ngModel)]="profile().city" placeholder="Bamako" (ngModelChange)="changed.set(true)" />
          </div>
          <div class="field span2">
            <label>Nom du point relais</label>
            <input type="text" [(ngModel)]="profile().relayName" placeholder="Relais Bamako Centre" (ngModelChange)="changed.set(true)" />
          </div>
        </div>
        @if (changed()) {
          <div class="form-actions">
            <button class="btn btn--ghost" (click)="reset()">Annuler</button>
            <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> }
              @else { <span class="material-icons">save</span> }
              Enregistrer
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Infos supplémentaires -->
    <div class="info-card">
      <h3>Informations de compte</h3>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">UID</span><span class="info-val mono">{{ uid() }}</span></div>
        <div class="info-item"><span class="info-label">Rôle</span><span class="info-val">relay_manager</span></div>
        <div class="info-item"><span class="info-label">Statut</span><span class="info-val success">Actif ✅</span></div>
      </div>
    </div>
  `,
  styleUrl: './relay-profile.component.scss'
})
export class RelayProfileComponent implements OnInit {
  private fs          = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private toast       = inject(ToastService);

  profile  = signal<RelayProfile>({ displayName: '', email: '' });
  original = signal<RelayProfile>({ displayName: '', email: '' });
  changed  = signal(false);
  saving   = signal(false);

  uid = () => this.authService.currentUser()?.uid ?? '—';

  async ngOnInit(): Promise<void> {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    try {
      const snap = await getDoc(doc(this.fs, 'admin_users', uid));
      if (snap.exists()) {
        const data = snap.data() as RelayProfile;
        this.profile.set(data);
        this.original.set({ ...data });
      } else {
        const user = this.authService.currentUser();
        this.profile.set({ displayName: user?.displayName ?? '', email: user?.email ?? '' });
      }
    } catch {}
  }

  async save(): Promise<void> {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    this.saving.set(true);
    try {
      await updateDoc(doc(this.fs, 'admin_users', uid), { ...this.profile(), updatedAt: Timestamp.now() });
      this.original.set({ ...this.profile() });
      this.changed.set(false);
      this.toast.success('Profil mis à jour');
    } catch { this.toast.error('Erreur de sauvegarde'); }
    finally { this.saving.set(false); }
  }

  reset(): void { this.profile.set({ ...this.original() }); this.changed.set(false); }

  initials(): string {
    const n = this.profile().displayName ?? '?';
    return n.split(' ').map((x: string) => x[0]).join('').toUpperCase().slice(0, 2);
  }
}
