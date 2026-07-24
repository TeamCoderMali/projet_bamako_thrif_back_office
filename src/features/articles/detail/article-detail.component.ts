import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { DataService, Product, AppUser } from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }    from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }   from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <div class="back-btn" (click)="back()">
      <span class="material-icons">arrow_back</span>
      Retour aux articles
    </div>

    @if (loading()) {
      <div class="skeleton-layout">
        <app-skeleton-loader height="300px" />
        <div><app-skeleton-loader height="24px" style="margin-bottom:12px"/><app-skeleton-loader height="16px" /></div>
      </div>
    } @else if (error()) {
      <div class="not-found">
        <span class="material-icons">error_outline</span>
        <p>{{ error() }}</p>
        <button class="btn btn--ghost" (click)="back()">Retour</button>
      </div>
    } @else if (!product()) {
      <div class="not-found">
        <span class="material-icons">search_off</span>
        <p>Article introuvable.</p>
      </div>
    } @else {
      <div class="detail-layout">
        <!-- Image Gallery -->
        <div class="gallery">
          @if (product()!.imageUrls?.length) {
            <img [src]="activeImg()" [alt]="product()!.title" class="gallery__main" />
            @if ((product()!.imageUrls?.length ?? 0) > 1) {
              <div class="gallery__thumbs">
                @for (img of product()!.imageUrls; track img) {
                  <img [src]="img" class="gallery__thumb" [class.active]="img === activeImg()"
                       (click)="activeImg.set(img)" />
                }
              </div>
            }
          } @else {
            <div class="gallery__placeholder">
              <span class="material-icons">image</span>
              <p>Aucune image</p>
            </div>
          }
        </div>

        <!-- Info Panel -->
        <div class="info-panel">
          <div class="info-header">
            <h2 class="info-title">{{ product()!.title }}</h2>
            <app-status-badge [status]="product()!.status" />
          </div>

          <div class="price-row">
            <span class="price">{{ product()!.price | number:'1.0-0' }} FCFA</span>
            <span class="condition tag">{{ product()!.condition || 'Non spécifié' }}</span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Catégorie</span>
              <span class="meta-value">{{ product()!.category || '—' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Vues</span>
              <span class="meta-value">{{ product()!.viewCount ?? 0 }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Publié le</span>
              <span class="meta-value">{{ formatDate(product()!.createdAt) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">ID</span>
              <span class="meta-value mono">{{ product()!.id | slice:0:16 }}…</span>
            </div>
          </div>

          @if (product()!.description) {
            <div class="description">
              <h4>Description</h4>
              <p>{{ product()!.description }}</p>
            </div>
          }

          <!-- Seller Info -->
          @if (seller()) {
            <div class="seller-card">
              <h4>Vendeur</h4>
              <div class="seller-info">
                @if (seller()!.photoURL) {
                  <img [src]="seller()!.photoURL" class="seller-avatar" />
                } @else {
                  <div class="seller-avatar-placeholder">{{ initials(seller()!.displayName) }}</div>
                }
                <div class="flex-grow">
                  <p class="seller-name">{{ seller()!.displayName || 'Sans nom' }}</p>
                  <p class="seller-email text-muted">{{ seller()!.email || '—' }}</p>
                </div>
                <button class="btn btn--ghost" (click)="viewSeller()">
                  <span class="material-icons">open_in_new</span>
                </button>
              </div>
            </div>
          } @else if (sellerLoading()) {
            <app-skeleton-loader height="60px" />
          }

          <!-- Moderation Actions -->
          <div class="action-section">
            <h4>Modération</h4>
            <div class="action-row">
              <button class="btn btn--success" (click)="setStatus('available')"
                      [disabled]="product()!.status === 'available' || updating()">
                <span class="material-icons">check_circle</span> Approuver
              </button>
              <button class="btn btn--warn" (click)="setStatus('inactive')"
                      [disabled]="product()!.status === 'inactive' || updating()">
                <span class="material-icons">visibility_off</span> Masquer
              </button>
              <button class="btn btn--danger" (click)="setStatus('rejected')"
                      [disabled]="product()!.status === 'rejected' || updating()">
                <span class="material-icons">block</span> Rejeter
              </button>
              <button class="btn btn--delete" (click)="confirmDelete()"
                      [disabled]="updating()">
                <span class="material-icons">delete_outline</span> Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (showDelete()) {
      <div class="overlay" (click)="showDelete.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <span class="material-icons" style="color:#f59e0b;font-size:48px!important">delete_forever</span>
          <h3>Supprimer cet article ?</h3>
          <p>Cette action est irréversible.</p>
          <div class="dialog__actions">
            <button class="btn btn--ghost" (click)="showDelete.set(false)">Annuler</button>
            <button class="btn btn--danger" (click)="doDelete()" [disabled]="updating()">Supprimer</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './article-detail.component.scss'
})
export class ArticleDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private fs          = inject(Firestore);
  private dataService = inject(DataService);
  private toast       = inject(ToastService);

  product       = signal<Product | null>(null);
  seller        = signal<AppUser | null>(null);
  loading       = signal(true);
  sellerLoading = signal(false);
  updating      = signal(false);
  activeImg     = signal('');
  error         = signal('');
  showDelete    = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID manquant'); this.loading.set(false); return; }

    try {
      const snap = await getDoc(doc(this.fs, 'product', id));
      if (!snap.exists()) {
        this.error.set('Article non trouvé dans Firestore (ID: ' + id + ')');
        this.loading.set(false);
        return;
      }
      const product = { id: snap.id, ...snap.data() } as Product;
      this.product.set(product);
      if (product.imageUrls?.[0]) this.activeImg.set(product.imageUrls[0]);
      this.loading.set(false);

      // Load seller
      if (product.sellerId) {
        this.sellerLoading.set(true);
        try {
          const sellerSnap = await getDoc(doc(this.fs, 'users', product.sellerId));
          if (sellerSnap.exists()) {
            this.seller.set({ id: sellerSnap.id, ...sellerSnap.data() } as AppUser);
          }
        } catch (err) {
          console.warn('[ArticleDetail] Could not load seller:', err);
        } finally {
          this.sellerLoading.set(false);
        }
      }
    } catch (err: any) {
      console.error('[ArticleDetail] Error loading article:', err?.code, err?.message);
      this.error.set(err?.message ?? 'Erreur Firestore');
      this.loading.set(false);
    }
  }

  async setStatus(status: string): Promise<void> {
    const p = this.product();
    if (!p) return;
    this.updating.set(true);
    try {
      await this.dataService.updateProductStatus(p.id, status);
      this.product.update(prev => prev ? { ...prev, status } : null);
      this.toast.success(`Statut mis à jour : ${status}`);
    } catch (err: any) {
      console.error('[ArticleDetail] setStatus error:', err?.message);
      this.toast.error('Impossible de modifier le statut');
    }
    finally { this.updating.set(false); }
  }

  confirmDelete(): void { this.showDelete.set(true); }

  async doDelete(): Promise<void> {
    const p = this.product();
    if (!p) return;
    this.updating.set(true);
    try {
      await this.dataService.deleteProduct(p.id);
      this.toast.success('Article supprimé');
      this.router.navigate(['/admin/articles']);
    } catch (err: any) {
      this.toast.error('Erreur de suppression');
    } finally {
      this.updating.set(false);
      this.showDelete.set(false);
    }
  }

  back(): void { this.router.navigate(['/admin/articles']); }
  viewSeller(): void {
    if (this.seller()) this.router.navigate(['/admin/users', this.seller()!.id]);
  }

  initials(name: string): string {
    return (name ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); }
    catch { return '—'; }
  }
}
