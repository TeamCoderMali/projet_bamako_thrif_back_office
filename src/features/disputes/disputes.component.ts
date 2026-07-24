import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, orderBy, collectionData, doc, updateDoc, addDoc, Timestamp } from '@angular/fire/firestore';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent }     from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  productTitle: string;
  reason: string;
  description?: string;
  status: 'open' | 'processing' | 'resolved' | 'closed';
  resolution?: string;
  createdAt: any;
  resolvedAt?: any;
}

@Component({
  selector: 'app-disputes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Litiges" subtitle="Gestion des conflits entre acheteurs et vendeurs">
      <div class="stats-row">
        <span class="stat-pill stat-pill--red">{{ countByStatus('open') }} ouverts</span>
        <span class="stat-pill stat-pill--orange">{{ countByStatus('processing') }} en traitement</span>
        <span class="stat-pill stat-pill--green">{{ countByStatus('resolved') }} résolus</span>
      </div>
    </app-page-header>

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Article, motif..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous les statuts</option>
        <option value="open">Ouverts</option>
        <option value="processing">En traitement</option>
        <option value="resolved">Résolus</option>
        <option value="closed">Fermés</option>
      </select>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3,4]; track i) { <app-skeleton-loader height="64px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <span class="material-icons">gavel</span>
          <p>Aucun litige trouvé. C'est une bonne nouvelle ! 🎉</p>
        </div>
      } @else {
        <div class="disputes-list">
          @for (d of filtered(); track d.id) {
            <div class="dispute-card" [class.open]="d.status === 'open'">
              <div class="dispute-card__left">
                <div class="dispute-icon" [class.urgent]="d.status === 'open'">
                  <span class="material-icons">{{ d.status === 'open' ? 'warning' : 'gavel' }}</span>
                </div>
              </div>
              <div class="dispute-card__body">
                <div class="dispute-header">
                  <span class="dispute-product">{{ d.productTitle || 'Article inconnu' }}</span>
                  <app-status-badge [status]="d.status" />
                </div>
                <p class="dispute-reason"><strong>Motif :</strong> {{ d.reason }}</p>
                @if (d.description) {
                  <p class="dispute-desc">{{ d.description }}</p>
                }
                @if (d.resolution) {
                  <p class="dispute-resolution"><span class="material-icons">check_circle</span> {{ d.resolution }}</p>
                }
                <p class="dispute-date">Créé le {{ formatDate(d.createdAt) }}</p>
              </div>
              <div class="dispute-card__actions">
                @if (d.status === 'open') {
                  <button class="btn btn--sm btn--orange" (click)="openResolve(d)">
                    <span class="material-icons">support_agent</span> Traiter
                  </button>
                }
                @if (d.status === 'processing') {
                  <button class="btn btn--sm btn--success" (click)="openResolve(d)">
                    <span class="material-icons">check_circle</span> Résoudre
                  </button>
                }
                @if (['resolved','closed'].includes(d.status)) {
                  <button class="btn btn--sm btn--ghost" (click)="closeDispute(d)">
                    <span class="material-icons">archive</span> Archiver
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Resolve Modal -->
    @if (resolveTarget()) {
      <div class="overlay" (click)="resolveTarget.set(null)">
        <div class="resolve-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ resolveTarget()!.status === 'open' ? 'Prendre en charge' : 'Résoudre' }} le litige</h3>
            <button class="btn-close" (click)="resolveTarget.set(null)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="dispute-summary">
              <p><strong>Article :</strong> {{ resolveTarget()!.productTitle }}</p>
              <p><strong>Motif :</strong> {{ resolveTarget()!.reason }}</p>
              @if (resolveTarget()!.description) { <p>{{ resolveTarget()!.description }}</p> }
            </div>
            <div class="field">
              <label>{{ resolveTarget()!.status === 'open' ? 'Commentaire (optionnel)' : 'Résolution *' }}</label>
              <textarea [(ngModel)]="resolutionText" rows="4"
                        [placeholder]="resolveTarget()!.status === 'open' ? 'Prise en charge...' : 'Détail de la résolution...'"
                        class="textarea"></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost" (click)="resolveTarget.set(null)">Annuler</button>
            @if (resolveTarget()!.status === 'open') {
              <button class="btn btn--orange" (click)="setProcessing()" [disabled]="saving()">
                @if (saving()) { <span class="spinner"></span> } Prendre en charge
              </button>
            } @else {
              <button class="btn btn--success" (click)="resolveDispute()" [disabled]="saving() || !resolutionText.trim()">
                @if (saving()) { <span class="spinner"></span> } Résoudre
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './disputes.component.scss'
})
export class DisputesComponent implements OnInit {
  private fs    = inject(Firestore);
  private toast = inject(ToastService);

  disputes      = signal<Dispute[]>([]);
  loading       = signal(true);
  searchQuery   = '';
  filterStatus  = '';
  resolveTarget = signal<Dispute | null>(null);
  resolutionText = '';
  saving        = signal(false);

  filtered = computed(() => {
    let list = this.disputes();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(d => d.productTitle?.toLowerCase().includes(q) || d.reason?.toLowerCase().includes(q));
    }
    if (this.filterStatus) list = list.filter(d => d.status === this.filterStatus);
    return list;
  });

  ngOnInit(): void {
    const q = query(collection(this.fs, 'disputes'), orderBy('createdAt', 'desc'));
    (collectionData(q, { idField: 'id' }) as any).subscribe({
      next: (data: Dispute[]) => { this.disputes.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  countByStatus(status: string): number { return this.disputes().filter(d => d.status === status).length; }

  openResolve(d: Dispute): void { this.resolveTarget.set(d); this.resolutionText = ''; }

  async setProcessing(): Promise<void> {
    const d = this.resolveTarget();
    if (!d) return;
    this.saving.set(true);
    try {
      await updateDoc(doc(this.fs, 'disputes', d.id), {
        status: 'processing',
        ...(this.resolutionText ? { resolution: this.resolutionText } : {}),
      });
      this.disputes.update(list => list.map(x => x.id === d.id ? { ...x, status: 'processing' } : x));
      this.resolveTarget.set(null);
      this.toast.success('Litige pris en charge');
    } catch { this.toast.error('Erreur'); }
    finally { this.saving.set(false); }
  }

  async resolveDispute(): Promise<void> {
    const d = this.resolveTarget();
    if (!d || !this.resolutionText.trim()) return;
    this.saving.set(true);
    try {
      await updateDoc(doc(this.fs, 'disputes', d.id), {
        status: 'resolved', resolution: this.resolutionText, resolvedAt: Timestamp.now(),
      });
      this.disputes.update(list => list.map(x => x.id === d.id ? { ...x, status: 'resolved', resolution: this.resolutionText } : x));
      this.resolveTarget.set(null);
      this.toast.success('Litige résolu');
    } catch { this.toast.error('Erreur'); }
    finally { this.saving.set(false); }
  }

  async closeDispute(d: Dispute): Promise<void> {
    try {
      await updateDoc(doc(this.fs, 'disputes', d.id), { status: 'closed' });
      this.disputes.update(list => list.map(x => x.id === d.id ? { ...x, status: 'closed' } : x));
      this.toast.info('Litige archivé');
    } catch { this.toast.error('Erreur'); }
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
