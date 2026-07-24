import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  where,
} from '@angular/fire/firestore';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt: any;
}

@Component({
  selector: 'app-orders-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
  ],
  template: `
    <app-page-header
      title="Historique des commandes"
      subtitle="Suivi de toutes les transactions passées sur la plateforme"
    />

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input
          type="text"
          class="search-input"
          placeholder="Rechercher un article, ID…"
          [(ngModel)]="search"
        />
      </div>
      <select class="filter-select" [(ngModel)]="filterStatus">
        <option value="">Tous les statuts</option>
        <option value="pending">En attente</option>
        <option value="processing">En cours</option>
        <option value="delivered">Livré</option>
        <option value="completed">Complété</option>
        <option value="cancelled">Annulé</option>
      </select>
      <select class="filter-select" [(ngModel)]="filterMethod">
        <option value="">Tout mode paiement</option>
        <option value="wave">Wave</option>
        <option value="orange_money">Orange Money</option>
        <option value="cash">Espèces</option>
      </select>
      <button class="btn btn--ghost" (click)="search = ''; filterStatus = ''; filterMethod = ''">
        <span class="material-icons">refresh</span>
      </button>
    </div>

    <!-- Summary pills -->
    <div class="summary-pills">
      <div class="pill">
        <span class="material-icons">receipt</span>
        Total : <strong>{{ filtered().length }}</strong>
      </div>
      <div class="pill pill--green">
        <span class="material-icons">check_circle</span>
        Livrés : <strong>{{ countByStatus('delivered') + countByStatus('completed') }}</strong>
      </div>
      <div class="pill pill--orange">
        <span class="material-icons">hourglass_empty</span>
        En attente : <strong>{{ countByStatus('pending') }}</strong>
      </div>
      <div class="pill pill--red">
        <span class="material-icons">cancel</span>
        Annulés : <strong>{{ countByStatus('cancelled') }}</strong>
      </div>
      <div class="pill pill--blue">
        <span class="material-icons">payments</span>
        Total FCFA : <strong>{{ totalAmount() | number: '1.0-0' }}</strong>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <app-skeleton-loader height="52px" />
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <span class="material-icons">receipt_long</span>
          <p>Aucune commande trouvée.</p>
          <small>Les commandes créées via l'app mobile apparaîtront ici.</small>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Montant</th>
              <th>Paiement</th>
              <th>Statut</th>
              <th>Date</th>
              <th>ID commande</th>
            </tr>
          </thead>
          <tbody>
            @for (o of paged(); track o.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (o.productImageUrl) {
                      <img [src]="o.productImageUrl" class="article-thumb" />
                    } @else {
                      <div class="article-thumb article-thumb--ph">
                        <span class="material-icons">checkroom</span>
                      </div>
                    }
                    <span class="article-title">{{ o.productTitle | slice: 0 : 32 }}</span>
                  </div>
                </td>
                <td class="price">{{ o.totalAmount | number: '1.0-0' }} FCFA</td>
                <td>
                  <span class="method-badge">{{ methodLabel(o.paymentMethod) }}</span>
                </td>
                <td><app-status-badge [status]="o.status" /></td>
                <td class="text-muted">{{ formatDate(o.createdAt) }}</td>
                <td>
                  <code class="mono">{{ o.id | slice: 0 : 10 }}…</code>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <!-- Pagination -->
        <div class="table-footer">
          <span>{{ filtered().length }} commandes</span>
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="prevPage()">
              <span class="material-icons">chevron_left</span>
            </button>
            <span class="page-info">Page {{ page() }} / {{ totalPages() }}</span>
            <button
              class="page-btn"
              [disabled]="page() === totalPages()"
              (click)="nextPage()"
            >
              <span class="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './orders-history.component.scss',
})
export class OrdersHistoryComponent implements OnInit {
  private fs = inject(Firestore);
  private router = inject(Router);

  orders = signal<Order[]>([]);
  loading = signal(true);
  page = signal(1);
  readonly pageSize = 15;

  search = '';
  filterStatus = '';
  filterMethod = '';

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.orders().filter((o) => {
      const matchSearch =
        !q ||
        o.productTitle?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.buyerId?.toLowerCase().includes(q);
      const matchStatus = !this.filterStatus || o.status === this.filterStatus;
      const matchMethod = !this.filterMethod || o.paymentMethod === this.filterMethod;
      return matchSearch && matchStatus && matchMethod;
    });
  });

  paged = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  totalAmount = computed(() => this.filtered().reduce((s, o) => s + (o.totalAmount ?? 0), 0));

  countByStatus = (s: string) => this.filtered().filter((o) => o.status === s).length;

  prevPage(): void { this.page.update(p => p - 1); }
  nextPage(): void { this.page.update(p => p + 1); }

  async ngOnInit(): Promise<void> {
    try {
      const snap = await getDocs(query(collection(this.fs, 'order'), limit(500)));
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      orders.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      this.orders.set(orders);
    } catch (err: any) {
      console.error('[OrdersHistory]', err?.message);
    } finally {
      this.loading.set(false);
    }
  }

  methodLabel(m?: string): string {
    const map: Record<string, string> = {
      wave: 'Wave',
      orange_money: 'Orange Money',
      cash: 'Espèces',
    };
    return m ? (map[m] ?? m) : '—';
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('fr-FR');
    } catch {
      return '—';
    }
  }
}
