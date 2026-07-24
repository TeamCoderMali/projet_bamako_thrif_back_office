import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, Product } from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
  ],
  template: `
    <app-page-header title="Articles" subtitle="Gestion de tous les articles publiés">
      <div class="stats-row">
        <span class="stat-pill stat-pill--green">{{ countByStatus('available') }} disponibles</span>
        <span class="stat-pill stat-pill--blue">{{ countByStatus('sold') }} vendus</span>
        <span class="stat-pill stat-pill--gray">{{ countByStatus('inactive') }} masqués</span>
      </div>
    </app-page-header>

    <!-- Barre de filtres -->
    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input
          type="text"
          placeholder="Rechercher par titre, catégorie..."
          [(ngModel)]="searchQuery"
          class="search-input"
        />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous les statuts</option>
        <option value="available">Disponible</option>
        <option value="sold">Vendu</option>
        <option value="inactive">Masqué</option>
        <option value="reserved">Réservé</option>
        <option value="pending">En attente</option>
        <option value="rejected">Rejeté</option>
      </select>
      <select [(ngModel)]="filterCategory" class="filter-select">
        <option value="">Toutes catégories</option>
        @for (cat of categories(); track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>
      <button class="btn-reset" (click)="resetFilters()">
        <span class="material-icons">refresh</span>
      </button>
    </div>

    <!-- Erreur Firestore -->
    @if (firestoreError()) {
      <div class="error-banner">
        <span class="material-icons">error_outline</span>
        <div>
          <strong>Erreur Firestore :</strong> {{ firestoreError() }}
          <br/><small>Vérifiez la console du navigateur (F12) et les règles Firestore.</small>
        </div>
        <button class="btn-retry" (click)="loadProducts()">Réessayer</button>
      </div>
    }

    <!-- Table -->
    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <app-skeleton-loader height="56px" />
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <span class="material-icons">checkroom</span>
          <p>Aucun article trouvé.</p>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Prix</th>
              <th>Catégorie</th>
              <th>Statut</th>
              <th>Vues</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of filtered(); track p.id) {
              <tr>
                <td>
                  <div class="article-cell">
                    @if (p.imageUrls?.[0]) {
                      <img [src]="p.imageUrls[0]" [alt]="p.title" class="article-thumb" />
                    } @else {
                      <div class="article-thumb article-thumb--placeholder">
                        <span class="material-icons">image</span>
                      </div>
                    }
                    <div class="article-info">
                      <span class="article-title">{{ p.title | slice:0:40 }}{{ (p.title?.length ?? 0) > 40 ? '…' : '' }}</span>
                      <span class="article-id text-muted">ID: {{ p.id | slice: 0 : 8 }}</span>
                    </div>
                  </div>
                </td>
                <td class="price">{{ p.price | number: '1.0-0' }} FCFA</td>
                <td class="text-muted">{{ p.category || '—' }}</td>
                <td><app-status-badge [status]="p.status" /></td>
                <td class="text-muted">{{ p.viewCount ?? 0 }}</td>
                <td class="text-muted">{{ formatDate(p.createdAt) }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" title="Voir le détail" (click)="viewDetail(p.id)">
                      <span class="material-icons">visibility</span>
                    </button>
                    @if (p.status !== 'available') {
                      <button
                        class="btn-icon btn-icon--success"
                        title="Rendre disponible"
                        (click)="updateStatus(p, 'available')"
                      >
                        <span class="material-icons">check_circle</span>
                      </button>
                    }
                    @if (p.status !== 'inactive') {
                      <button
                        class="btn-icon btn-icon--warn"
                        title="Masquer"
                        (click)="updateStatus(p, 'inactive')"
                      >
                        <span class="material-icons">visibility_off</span>
                      </button>
                    }
                    @if (p.status !== 'rejected') {
                      <button
                        class="btn-icon btn-icon--danger"
                        title="Rejeter"
                        (click)="updateStatus(p, 'rejected')"
                      >
                        <span class="material-icons">block</span>
                      </button>
                    }
                    <button
                      class="btn-icon btn-icon--delete"
                      title="Supprimer"
                      (click)="confirmDelete(p)"
                    >
                      <span class="material-icons">delete_outline</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="table-footer">
          Affichage de {{ filtered().length }} / {{ products().length }} articles
        </div>
      }
    </div>

    <!-- Confirm delete -->
    @if (deleteTarget()) {
      <div class="overlay" (click)="deleteTarget.set(null)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <span class="material-icons dialog__icon">delete_forever</span>
          <h3>Supprimer cet article ?</h3>
          <p>
            <strong>{{ deleteTarget()?.title }}</strong> sera définitivement supprimé.
          </p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="deleteTarget.set(null)">Annuler</button>
            <button class="btn btn--danger" (click)="doDelete()" [disabled]="deleting()">
              @if (deleting()) {
                <span class="spinner"></span>
              }
              Supprimer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit {
  private dataService = inject(DataService);
  private toast = inject(ToastService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  loading = signal(true);
  firestoreError = signal('');
  searchQuery = '';
  filterStatus = '';
  filterCategory = '';
  deleteTarget = signal<Product | null>(null);
  deleting = signal(false);

  filtered = computed(() => {
    let list = this.products();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      );
    }
    if (this.filterStatus) list = list.filter((p) => p.status === this.filterStatus);
    if (this.filterCategory) list = list.filter((p) => p.category === this.filterCategory);
    return list;
  });

  categories = computed(() => {
    const cats = new Set(
      this.products()
        .map((p) => p.category)
        .filter(Boolean),
    );
    return Array.from(cats) as string[];
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.firestoreError.set('');
    this.dataService.getProducts(500).subscribe({
      next: (data) => {
        console.log('[ArticlesList] Loaded', data.length, 'products');
        this.products.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ArticlesList] Error:', err);
        this.firestoreError.set(err?.message ?? 'Erreur inconnue');
        this.loading.set(false);
      },
    });
  }

  countByStatus(status: string): number {
    return this.products().filter((p) => p.status === status).length;
  }

  async updateStatus(product: Product, status: string): Promise<void> {
    try {
      await this.dataService.updateProductStatus(product.id, status);
      this.products.update((list) => list.map((p) => (p.id === product.id ? { ...p, status } : p)));
      this.toast.success(`Statut mis à jour : ${status}`);
    } catch {
      this.toast.error('Impossible de modifier le statut');
    }
  }

  confirmDelete(p: Product): void {
    this.deleteTarget.set(p);
  }

  async doDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    try {
      await this.dataService.deleteProduct(target.id);
      this.products.update((list) => list.filter((p) => p.id !== target.id));
      this.deleteTarget.set(null);
      this.toast.success('Article supprimé');
    } catch {
      this.toast.error('Erreur lors de la suppression');
    } finally {
      this.deleting.set(false);
    }
  }

  viewDetail(id: string): void {
    this.router.navigate(['/admin/articles', id]);
  }
  resetFilters(): void {
    this.searchQuery = '';
    this.filterStatus = '';
    this.filterCategory = '';
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }
}
