import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, getDocs, updateDoc, doc, Timestamp, limit } from '@angular/fire/firestore';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface Article { id: string; title: string; price: number; status: string; imageUrls: string[]; createdAt: any; }

@Component({
  selector: 'app-relay-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Mes Articles" subtitle="Articles assignés à votre point relais" />

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Rechercher..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous</option>
        <option value="reserved">Réservé</option>
        <option value="available">Disponible</option>
        <option value="sold">Vendu</option>
      </select>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3,4]; track i) { <app-skeleton-loader height="56px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state"><span class="material-icons">inventory_2</span><p>Aucun article.</p></div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Article</th><th>Prix</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (a of filtered(); track a.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (a.imageUrls?.[0]) { <img [src]="a.imageUrls[0]" class="article-thumb" /> }
                    @else { <div class="article-thumb article-thumb--ph"><span class="material-icons">image</span></div> }
                    <span class="article-title">{{ a.title | slice:0:40 }}</span>
                  </div>
                </td>
                <td class="price">{{ a.price | number:'1.0-0' }} FCFA</td>
                <td><app-status-badge [status]="a.status" /></td>
                <td class="text-muted">{{ formatDate(a.createdAt) }}</td>
                <td>
                  <div class="actions">
                    @if (a.status === 'reserved') {
                      <button class="btn-sm btn-sm--success" (click)="markDelivered(a)">
                        <span class="material-icons">check</span> Livré
                      </button>
                      <button class="btn-sm btn-sm--danger" (click)="reportNC(a)">
                        <span class="material-icons">report</span> NC
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="table-footer">{{ filtered().length }} article(s)</div>
      }
    </div>
  `,
  styleUrl: './relay-articles.component.scss'
})
export class RelayArticlesComponent implements OnInit {
  private fs    = inject(Firestore);
  private toast = inject(ToastService);

  articles     = signal<Article[]>([]);
  loading      = signal(true);
  searchQuery  = '';
  filterStatus = '';

  filtered = computed(() => {
    let list = this.articles();
    if (this.searchQuery) { const q = this.searchQuery.toLowerCase(); list = list.filter(a => a.title?.toLowerCase().includes(q)); }
    if (this.filterStatus) list = list.filter(a => a.status === this.filterStatus);
    return list;
  });

  async ngOnInit(): Promise<void> {
    try {
      const snap = await getDocs(query(collection(this.fs, 'product'), limit(200)));
      this.articles.set(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
    } catch {} finally { this.loading.set(false); }
  }

  async markDelivered(a: Article): Promise<void> {
    try {
      await updateDoc(doc(this.fs, 'product', a.id), { status: 'sold', deliveredAt: Timestamp.now() });
      this.articles.update(list => list.map(x => x.id === a.id ? { ...x, status: 'sold' } : x));
      this.toast.success('Article marqué comme livré');
    } catch { this.toast.error('Erreur'); }
  }

  reportNC(a: Article): void { this.toast.info(`Rapport NC pour "${a.title}" — fonctionnalité dans l'onglet Non-conformités`); }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
