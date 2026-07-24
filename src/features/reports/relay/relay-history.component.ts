import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, where, getDocs, limit, orderBy } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface HistoryEntry { id: string; title: string; price: number; status: string; imageUrls: string[]; createdAt: any; deliveredAt?: any; }

@Component({
  selector: 'app-relay-history',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Historique" subtitle="Articles traités par votre point relais">
      <span class="stat-pill">{{ history().length }} articles traités</span>
    </app-page-header>

    <div class="table-card">
      @if (loading()) { <div class="skeleton-list">@for (i of [1,2,3,4,5]; track i) { <app-skeleton-loader height="56px" /> }</div> }
      @else if (history().length === 0) {
        <div class="empty-state"><span class="material-icons">history</span><p>Aucun article traité pour le moment.</p></div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Article</th><th>Prix</th><th>Statut</th><th>Reçu le</th><th>Livré le</th></tr></thead>
          <tbody>
            @for (h of history(); track h.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (h.imageUrls?.[0]) { <img [src]="h.imageUrls[0]" class="article-thumb" /> }
                    @else { <div class="article-thumb article-thumb--ph"><span class="material-icons">image</span></div> }
                    <span class="article-title">{{ h.title | slice:0:40 }}</span>
                  </div>
                </td>
                <td class="price">{{ h.price | number:'1.0-0' }} FCFA</td>
                <td><app-status-badge [status]="h.status" /></td>
                <td class="text-muted">{{ formatDate(h.createdAt) }}</td>
                <td class="text-muted">{{ formatDate(h.deliveredAt) }}</td>
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
  private fs          = inject(Firestore);
  private authService: AuthService = inject(AuthService);

  history = signal<HistoryEntry[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const snap = await getDocs(query(collection(this.fs, 'product'), where('status', '==', 'sold'), limit(200)));
      this.history.set(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryEntry)));
    } catch {} finally { this.loading.set(false); }
  }

  formatDate(ts: any): string {
    if (!ts) return '—'; try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
