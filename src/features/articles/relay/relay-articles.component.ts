import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, getDocs, updateDoc, doc, Timestamp, limit, where } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

// ── Parcours commande (cahier des charges 4.5) ──────────────────────────────
// pending (Vendu / en attente dépôt) → deposited (Déposé) → processing
// (En traitement : inspection + lavage/repassage) → ready_pickup (Disponible)
// → completed (Récupéré). "cancelled" possible à tout moment côté admin/app.
interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  totalAmount: number;
  status: string;
  isVerified?: boolean;
  createdAt: any;
}

const NEXT_STEP: Record<string, { next: string; label: string; icon: string }> = {
  pending:    { next: 'deposited',    label: 'Marquer déposé',           icon: 'inventory_2' },
  deposited:  { next: 'processing',   label: 'Démarrer traitement',      icon: 'local_laundry_service' },
  processing: { next: 'ready_pickup', label: 'Marquer disponible',       icon: 'check_circle' },
  ready_pickup: { next: 'completed',  label: 'Marquer récupéré',         icon: 'done_all' },
};

@Component({
  selector: 'app-relay-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Commandes à traiter" subtitle="Suivez le parcours de chaque article : dépôt → inspection → disponible → retrait" />

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Rechercher..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Toutes les étapes</option>
        <option value="pending">En attente dépôt</option>
        <option value="deposited">Déposé</option>
        <option value="processing">En traitement</option>
        <option value="ready_pickup">Disponible (retrait)</option>
        <option value="completed">Récupéré</option>
      </select>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3,4]; track i) { <app-skeleton-loader height="56px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state"><span class="material-icons">inventory_2</span><p>Aucune commande à traiter.</p></div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Article</th><th>Montant</th><th>Étape</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (o of filtered(); track o.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (o.productImageUrl) { <img [src]="o.productImageUrl" class="article-thumb" /> }
                    @else { <div class="article-thumb article-thumb--ph"><span class="material-icons">image</span></div> }
                    <span class="article-title">{{ o.productTitle | slice:0:40 }}</span>
                    @if (o.isVerified) {
                      <span class="material-icons" title="Vérifié DANAYA" style="color:#16a34a;font-size:18px;">verified</span>
                    }
                  </div>
                </td>
                <td class="price">{{ o.totalAmount | number:'1.0-0' }} FCFA</td>
                <td><app-status-badge [status]="o.status" /></td>
                <td class="text-muted">{{ formatDate(o.createdAt) }}</td>
                <td>
                  <div class="actions">
                    @if (nextStep(o.status); as step) {
                      <button class="btn-sm btn-sm--success" (click)="advance(o)">
                        <span class="material-icons">{{ step.icon }}</span> {{ step.label }}
                      </button>
                    }
                    @if (!o.isVerified && (o.status === 'deposited' || o.status === 'processing')) {
                      <button class="btn-sm btn-sm--success" (click)="markVerified(o)">
                        <span class="material-icons">verified</span> Vérifier
                      </button>
                    }
                    @if (o.status !== 'completed' && o.status !== 'cancelled') {
                      <button class="btn-sm btn-sm--danger" (click)="reportNC(o)">
                        <span class="material-icons">report</span> NC
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="table-footer">{{ filtered().length }} commande(s)</div>
      }
    </div>
  `,
  styleUrl: './relay-articles.component.scss'
})
export class RelayArticlesComponent implements OnInit {
  private fs     = inject(Firestore);
  private toast  = inject(ToastService);
  private router = inject(Router);

  orders       = signal<Order[]>([]);
  loading      = signal(true);
  searchQuery  = '';
  filterStatus = '';

  filtered = computed(() => {
    let list = this.orders();
    if (this.searchQuery) { const q = this.searchQuery.toLowerCase(); list = list.filter(o => o.productTitle?.toLowerCase().includes(q)); }
    if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
    return list;
  });

  nextStep(status: string) { return NEXT_STEP[status] ?? null; }

  async ngOnInit(): Promise<void> {
    try {
      // On affiche les commandes actives (tout ce qui n'est pas encore récupéré/annulé)
      const snap = await getDocs(query(collection(this.fs, 'order'), limit(300)));
      const orders = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      orders.sort((a: any, b: any) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      this.orders.set(orders);
    } catch (err: any) {
      console.error('[RelayArticles] load error:', err?.message);
    } finally { this.loading.set(false); }
  }

  async advance(o: Order): Promise<void> {
    const step = this.nextStep(o.status);
    if (!step) return;
    try {
      await updateDoc(doc(this.fs, 'order', o.id), { status: step.next, updatedAt: Timestamp.now() });
      if (step.next === 'completed') {
        // Commande récupérée : on retire l'article de la liste des choses à traiter
        this.orders.update(list => list.filter(x => x.id !== o.id));
      } else {
        this.orders.update(list => list.map(x => x.id === o.id ? { ...x, status: step.next } : x));
      }
      this.toast.success(`Étape mise à jour : ${step.label}`);
    } catch (err: any) {
      console.error('[RelayArticles] advance error:', err?.message);
      this.toast.error('Erreur lors de la mise à jour');
    }
  }

  async markVerified(o: Order): Promise<void> {
    try {
      await updateDoc(doc(this.fs, 'product', o.productId), { isVerified: true, updatedAt: Timestamp.now() });
      this.orders.update(list => list.map(x => x.id === o.id ? { ...x, isVerified: true } : x));
      this.toast.success('Article marqué comme vérifié (inspection OK)');
    } catch (err: any) {
      console.error('[RelayArticles] markVerified error:', err?.message);
      this.toast.error('Erreur');
    }
  }

  reportNC(o: Order): void {
    this.router.navigate(['/relay/non-conformities'], { queryParams: { productTitle: o.productTitle, orderId: o.id } });
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
