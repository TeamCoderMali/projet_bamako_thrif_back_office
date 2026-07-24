import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, getDoc, setDoc, Timestamp } from '@angular/fire/firestore';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface AppSettings {
  platformName: string;
  supportEmail: string;
  commissionRate: number;
  maxImagesPerProduct: number;
  minPrice: number;
  maxPrice: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  autoApproveProducts: boolean;
  notifyNewArticle: boolean;
  notifyNewOrder: boolean;
  notifyNewDispute: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  platformName: 'DANAYA', supportEmail: 'support@danaya.ml',
  commissionRate: 5, maxImagesPerProduct: 5, minPrice: 500, maxPrice: 5000000,
  maintenanceMode: false, allowNewRegistrations: true, autoApproveProducts: false,
  notifyNewArticle: true, notifyNewOrder: true, notifyNewDispute: true,
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Paramètres" subtitle="Configuration générale de la plateforme DANAYA" />

    <div class="settings-grid">
      <!-- Général -->
      <div class="settings-card">
        <div class="settings-card__header">
          <span class="material-icons section-icon">tune</span>
          <h3>Général</h3>
        </div>
        <div class="settings-body">
          <div class="field">
            <label>Nom de la plateforme</label>
            <input type="text" [(ngModel)]="settings().platformName" (ngModelChange)="update('platformName', $event)" />
          </div>
          <div class="field">
            <label>Email support</label>
            <input type="email" [(ngModel)]="settings().supportEmail" (ngModelChange)="update('supportEmail', $event)" />
          </div>
          <div class="field">
            <label>Commission (%)</label>
            <input type="number" min="0" max="50" [(ngModel)]="settings().commissionRate" (ngModelChange)="update('commissionRate', +$event)" />
          </div>
          <div class="field">
            <label>Images max par article</label>
            <input type="number" min="1" max="20" [(ngModel)]="settings().maxImagesPerProduct" (ngModelChange)="update('maxImagesPerProduct', +$event)" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Prix min (FCFA)</label>
              <input type="number" [(ngModel)]="settings().minPrice" (ngModelChange)="update('minPrice', +$event)" />
            </div>
            <div class="field">
              <label>Prix max (FCFA)</label>
              <input type="number" [(ngModel)]="settings().maxPrice" (ngModelChange)="update('maxPrice', +$event)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Modes -->
      <div class="settings-card">
        <div class="settings-card__header">
          <span class="material-icons section-icon" style="color:#ea580c">power_settings_new</span>
          <h3>Modes de fonctionnement</h3>
        </div>
        <div class="settings-body">
          @for (toggle of modeToggles; track toggle.key) {
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">{{ toggle.label }}</span>
                <span class="toggle-desc">{{ toggle.desc }}</span>
              </div>
              <button class="toggle-btn" [class.on]="getVal(toggle.key)"
                      (click)="flipToggle(toggle.key)">
                <span class="toggle-thumb"></span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-card">
        <div class="settings-card__header">
          <span class="material-icons section-icon" style="color:#2563eb">notifications</span>
          <h3>Notifications admin</h3>
        </div>
        <div class="settings-body">
          @for (toggle of notifToggles; track toggle.key) {
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">{{ toggle.label }}</span>
              </div>
              <button class="toggle-btn" [class.on]="getVal(toggle.key)"
                      (click)="flipToggle(toggle.key)">
                <span class="toggle-thumb"></span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Profil admin -->
      <div class="settings-card">
        <div class="settings-card__header">
          <span class="material-icons section-icon" style="color:#7c3aed">manage_accounts</span>
          <h3>Mon profil admin</h3>
        </div>
        <div class="settings-body">
          <div class="admin-profile">
            <div class="admin-avatar">{{ adminInitials() }}</div>
            <div class="admin-info">
              <p class="admin-name">{{ authService.currentUser()?.displayName }}</p>
              <p class="admin-email text-muted">{{ authService.currentUser()?.email }}</p>
              <span class="role-badge">👑 Administrateur</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save bar -->
    <div class="save-bar" [class.visible]="hasChanges()">
      <p><span class="material-icons">info</span> Modifications non sauvegardées</p>
      <div class="save-actions">
        <button class="btn btn--ghost" (click)="reset()">Annuler</button>
        <button class="btn btn--primary" (click)="save()" [disabled]="saving()">
          @if (saving()) { <span class="spinner"></span> }
          @else { <span class="material-icons">save</span> }
          Enregistrer
        </button>
      </div>
    </div>
  `,
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private fs          = inject(Firestore);
  private toast       = inject(ToastService);
  authService: AuthService = inject(AuthService);

  settings   = signal<AppSettings>({ ...DEFAULT_SETTINGS });
  original   = signal<AppSettings>({ ...DEFAULT_SETTINGS });
  saving     = signal(false);
  hasChanges = signal(false);

  modeToggles = [
    { key: 'maintenanceMode',       label: 'Mode maintenance',           desc: 'Bloquer l\'accès à l\'appli mobile' },
    { key: 'allowNewRegistrations', label: 'Nouvelles inscriptions',     desc: 'Autoriser de nouveaux comptes' },
    { key: 'autoApproveProducts',   label: 'Approbation automatique',    desc: 'Publier sans modération' },
  ];
  notifToggles = [
    { key: 'notifyNewArticle',  label: 'Nouvel article publié' },
    { key: 'notifyNewOrder',    label: 'Nouvelle commande' },
    { key: 'notifyNewDispute',  label: 'Nouveau litige' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const snap = await getDoc(doc(this.fs, 'app_settings', 'config'));
      if (snap.exists()) {
        const data = { ...DEFAULT_SETTINGS, ...snap.data() } as AppSettings;
        this.settings.set(data);
        this.original.set({ ...data });
      }
    } catch {}
  }

  update(key: string, value: any): void {
    this.settings.update(s => ({ ...s, [key]: value }));
    this.hasChanges.set(true);
  }

  getVal(key: string): boolean { return (this.settings() as any)[key] as boolean; }

  flipToggle(key: string): void {
    this.settings.update(s => ({ ...s, [key]: !(s as any)[key] }));
    this.hasChanges.set(true);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await setDoc(doc(this.fs, 'app_settings', 'config'), {
        ...this.settings(),
        updatedAt: Timestamp.now(),
      });
      this.original.set({ ...this.settings() });
      this.hasChanges.set(false);
      this.toast.success('Paramètres sauvegardés');
    } catch { this.toast.error('Erreur de sauvegarde'); }
    finally { this.saving.set(false); }
  }

  reset(): void { this.settings.set({ ...this.original() }); this.hasChanges.set(false); }

  adminInitials(): string {
    const name = this.authService.currentUser()?.displayName ?? 'A';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
