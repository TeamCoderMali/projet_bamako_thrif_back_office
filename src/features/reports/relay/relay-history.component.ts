import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, where, getDocs, limit } from '@angular/fire/firestore';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface HistoryEntry {
  id: string;
  productTitle: string;
  productImageUrl?: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  updatedAt?: any;
}

@Component({
  selector: 'app-relay-history',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Historique" subtitle="Commandes récupérées par les acheteurs">
      <span class="stat-pill">{{ history().length }} commandes récupérées</span>
    </app-page-header>

    <div class="table-card">
      @if (loading()) { <div class="skeleton-list">@for (i of [1,2,3,4,5]; track i) { <app-skeleton-loader height="56px" /> }</div> }
      @else if (history().length === 0) {
        <div class="empty-state"><span class="material-icons">history</span><p>Aucune commande récupérée pour le moment.</p></div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Article</th><th>Montant</th><th>Statut</th><th>Vendu le</th><th>Récupéré le</th></tr></thead>
          <tbody>
            @for (h of history(); track h.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (h.productImageUrl) { <img [src]="h.productImageUrl" class="article-thumb" /> }
                    @else { <div class="article-thumb article-thumb--ph"><span class="material-icons">image</span></div> }
                    <span class="article-title">{{ h.productTitle | slice:0:40 }}</span>
                  </div>
                </td>
                <td class="price">{{ h.totalAmount | number:'1.0-0' }} FCFA</td>
                <td><app-status-badge [status]="h.status" /></td>
                <td class="text-muted">{{ formatDate(h.createdAt) }}</td>
                <td class="text-muted">{{ formatDate(h.updatedAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="table-footer">{{ history().length }} entrée(s)</div>
      }
    </div>
  `,
  styleUrl: './relay-history.component.scss'
})
export class RelayHistoryComponent implements OnInit {
  private fs = inject(Firestore);

  history = signal<HistoryEntry[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      // Aligné sur le parcours commande : "Récupéré" = order.status === 'completed'
      const snap = await getDocs(query(collection(this.fs, 'order'), where('status', '==', 'completed'), limit(200)));
      this.history.set(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryEntry)));
    } catch {} finally { this.loading.set(false); }
  }

  formatDate(ts: any): string {
    if (!ts) return '—'; try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
