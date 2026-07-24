import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, RelayCenter } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent }     from '../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-relay-centers',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Points Relais" subtitle="Gestion des points de dépôt/retrait">
      <button class="btn btn--primary" (click)="openCreate()">
        <span class="material-icons">add</span> Nouveau point relais
      </button>
    </app-page-header>

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Nom, ville..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
    </div>

    <!-- Grid des relais -->
    @if (loading()) {
      <div class="relay-grid">@for (i of [1,2,3,4]; track i) { <app-skeleton-loader height="160px" /> }</div>
    } @else if (filtered().length === 0) {
      <div class="empty-state">
        <span class="material-icons">store_mall_directory</span>
        <p>Aucun point relais. Créez-en un !</p>
      </div>
    } @else {
      <div class="relay-grid">
        @for (rc of filtered(); track rc.id) {
          <div class="relay-card" [class.inactive]="!rc.isActive">
            <div class="relay-card__header">
              <div class="relay-icon">
                <span class="material-icons">store</span>
              </div>
              <div class="relay-status" [class.active]="rc.isActive">
                {{ rc.isActive ? 'Actif' : 'Inactif' }}
              </div>
            </div>
            <h3 class="relay-name">{{ rc.name }}</h3>
            <p class="relay-addr"><span class="material-icons">location_on</span>{{ rc.address }}, {{ rc.city }}</p>
            @if (rc.phone) {
              <p class="relay-phone"><span class="material-icons">phone</span>{{ rc.phone }}</p>
            }
            @if (rc.managerName) {
              <p class="relay-manager"><span class="material-icons">person</span>{{ rc.managerName }}</p>
            }
            <div class="relay-actions">
              <button class="btn-icon btn-icon--edit" (click)="openEdit(rc)">
                <span class="material-icons">edit</span>
              </button>
              <button class="btn-icon btn-icon--delete" (click)="confirmDelete(rc)">
                <span class="material-icons">delete_outline</span>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- Form Modal (Create/Edit) -->
    @if (showForm()) {
      <div class="overlay" (click)="closeForm()">
        <div class="form-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editTarget() ? 'Modifier' : 'Nouveau' }} point relais</h3>
            <button class="btn-close" (click)="closeForm()"><span class="material-icons">close</span></button>
          </div>
          <div class="form-grid">
            <div class="field span2">
              <label>Nom du point relais *</label>
              <input type="text" [(ngModel)]="form.name" placeholder="Relais Bamako Centre" />
            </div>
            <div class="field span2">
              <label>Adresse *</label>
              <input type="text" [(ngModel)]="form.address" placeholder="Rue 45, Hamdallaye" />
            </div>
            <div class="field">
              <label>Ville *</label>
              <input type="text" [(ngModel)]="form.city" placeholder="Bamako" />
            </div>
            <div class="field">
              <label>Téléphone</label>
              <input type="tel" [(ngModel)]="form.phone" placeholder="+223 70 00 00 00" />
            </div>
            <div class="field">
              <label>Nom du responsable</label>
              <input type="text" [(ngModel)]="form.managerName" placeholder="Moussa Traoré" />
            </div>
            <div class="field">
              <label>Statut</label>
              <select [(ngModel)]="form.isActive">
                <option [ngValue]="true">Actif</option>
                <option [ngValue]="false">Inactif</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost" (click)="closeForm()">Annuler</button>
            <button class="btn btn--primary" (click)="saveRelay()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> }
              @else { <span class="material-icons">save</span> }
              {{ editTarget() ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm delete -->
    @if (deleteTarget()) {
      <div class="overlay" (click)="deleteTarget.set(null)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <span class="material-icons dialog__icon">delete_forever</span>
          <h3>Supprimer ce relais ?</h3>
          <p><strong>{{ deleteTarget()!.name }}</strong> sera définitivement supprimé.</p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="deleteTarget.set(null)">Annuler</button>
            <button class="btn btn--danger" (click)="doDelete()" [disabled]="deleting()">
              @if (deleting()) { <span class="spinner"></span> } Supprimer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './relay-centers.component.scss'
})
export class RelayCentersComponent implements OnInit {
  private dataService = inject(DataService);
  private toast       = inject(ToastService);

  relays       = signal<RelayCenter[]>([]);
  loading      = signal(true);
  searchQuery  = '';
  showForm     = signal(false);
  saving       = signal(false);
  editTarget   = signal<RelayCenter | null>(null);
  deleteTarget = signal<RelayCenter | null>(null);
  deleting     = signal(false);

  form: Partial<RelayCenter> = { name: '', address: '', city: '', phone: '', managerName: '', isActive: true };

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.relays();
    return this.relays().filter(rc =>
      rc.name.toLowerCase().includes(q) || rc.city.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.dataService.getRelayCenters().subscribe({
      next: (data) => { this.relays.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Erreur de chargement'); },
    });
  }

  openCreate(): void { this.editTarget.set(null); this.form = { name: '', address: '', city: '', phone: '', managerName: '', isActive: true }; this.showForm.set(true); }
  openEdit(rc: RelayCenter): void { this.editTarget.set(rc); this.form = { ...rc }; this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editTarget.set(null); }
  confirmDelete(rc: RelayCenter): void { this.deleteTarget.set(rc); }

  async saveRelay(): Promise<void> {
    if (!this.form.name || !this.form.city) { this.toast.warning('Nom et ville obligatoires'); return; }
    this.saving.set(true);
    try {
      const id = this.editTarget()?.id;
      await this.dataService.saveRelayCenter(this.form, id);
      this.toast.success(id ? 'Point relais mis à jour' : 'Point relais créé');
      // refresh
      this.dataService.getRelayCenters().subscribe(d => this.relays.set(d));
      this.closeForm();
    } catch { this.toast.error('Erreur lors de la sauvegarde'); }
    finally { this.saving.set(false); }
  }

  async doDelete(): Promise<void> {
    const rc = this.deleteTarget();
    if (!rc) return;
    this.deleting.set(true);
    try {
      await this.dataService.deleteRelayCenter(rc.id);
      this.relays.update(list => list.filter(r => r.id !== rc.id));
      this.deleteTarget.set(null);
      this.toast.success('Point relais supprimé');
    } catch { this.toast.error('Erreur de suppression'); }
    finally { this.deleting.set(false); }
  }
}
