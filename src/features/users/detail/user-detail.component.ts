import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, collection, query, where, getDocs, limit } from '@angular/fire/firestore';
import { DataService, AppUser, Product, Order } from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }    from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }   from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <div class="back-btn" (click)="back()">
      <span class="material-icons">arrow_back</span> Retour aux utilisateurs
    </div>

    @if (loading()) {
      <div class="grid2">
        <app-skeleton-loader height="200px" />
        <app-skeleton-loader height="200px" />
      </div>
    } @else if (error()) {
      <div class="not-found">
        <span class="material-icons">error_outline</span>
        <p>{{ error() }}</p>
      </div>
    } @else if (!user()) {
      <div class="not-found">
        <span class="material-icons">person_off</span>
        <p>Utilisateur introuvable.</p>
      </div>
    } @else {
      <!-- Header card -->
      <div class="user-hero">
        @if (user()!.photoURL) {
          <img [src]="user()!.photoURL" class="hero-avatar" [alt]="user()!.displayName" />
        } @else {
          <div class="hero-avatar hero-avatar--initials">{{ initials(user()!.displayName) }}</div>
        }
        <div class="hero-info">
          <h2 class="hero-name">{{ user()!.displayName || 'Sans nom' }}</h2>
          <p class="hero-email">{{ user()!.email }}</p>
          <div class="hero-meta">
            <span class="tag">Inscrit le {{ formatDate(user()!.createdAt) }}</span>
            <span class="tag" [class.tag--banned]="user()!.isBanned">
              {{ user()!.isBanned ? '🚫 Banni' : '✅ Actif' }}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn"
                  [class.btn--danger]="!user()!.isBanned"
                  [class.btn--success]="user()!.isBanned"
                  (click)="toggleBan()" [disabled]="updating()">
            <span class="material-icons">{{ user()!.isBanned ? 'lock_open' : 'block' }}</span>
            {{ user()!.isBanned ? 'Débannir' : 'Bannir' }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-box">
          <span class="stat-val">{{ products().length }}</span>
          <span class="stat-lbl">Articles</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ orders().length }}</span>
          <span class="stat-lbl">Commandes</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ soldCount() }}</span>
          <span class="stat-lbl">Vendus</span>
        </div>
      </div>

      <div class="grid2">
        <!-- Articles -->
        <div class="panel">
          <h3 class="panel__title">
            <span class="material-icons">checkroom</span>
            Articles ({{ products().length }})
          </h3>
          @if (productsLoading()) {
            <app-skeleton-loader height="48px" />
          } @else if (products().length === 0) {
            <p class="text-muted">Aucun article publié.</p>
          } @else {
            @for (p of products().slice(0, 8); track p.id) {
              <div class="mini-row" (click)="goArticle(p.id)">
                @if (p.imageUrls?.[0]) {
                  <img [src]="p.imageUrls[0]" class="mini-img" />
                } @else {
                  <div class="mini-img mini-img--ph">
                    <span class="material-icons">image</span>
                  </div>
                }
                <div class="mini-info">
                  <span class="mini-title">{{ p.title | slice:0:30 }}</span>
                  <span class="mini-price">{{ p.price | number:'1.0-0' }} FCFA</span>
                </div>
                <app-status-badge [status]="p.status" />
              </div>
            }
          }
        </div>

        <!-- Commandes -->
        <div class="panel">
          <h3 class="panel__title">
            <span class="material-icons">shopping_cart</span>
            Commandes ({{ orders().length }})
          </h3>
          @if (ordersLoading()) {
            <app-skeleton-loader height="48px" />
          } @else if (orders().length === 0) {
            <p class="text-muted">Aucune commande.</p>
          } @else {
            @for (o of orders().slice(0, 8); track o.id) {
              <div class="mini-row">
                <div class="mini-info">
                  <span class="mini-title">{{ o.productTitle | slice:0:32 }}</span>
                  <span class="mini-price">{{ o.totalAmount | number:'1.0-0' }} FCFA</span>
                </div>
                <app-status-badge [status]="o.status" />
              </div>
            }
          }
        </div>
      </div>
    }
  `,
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private fs          = inject(Firestore);
  private dataService = inject(DataService);
  private toast       = inject(ToastService);

  user            = signal<AppUser | null>(null);
  products        = signal<Product[]>([]);
  orders          = signal<Order[]>([]);
  loading         = signal(true);
  productsLoading = signal(true);
  ordersLoading   = signal(true);
  updating        = signal(false);
  error           = signal('');

  soldCount = () => this.products().filter(p => p.status === 'sold').length;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID manquant'); this.loading.set(false); return; }

    try {
      const snap = await getDoc(doc(this.fs, 'users', id));
      if (!snap.exists()) {
        this.error.set('Utilisateur introuvable');
        this.loading.set(false);
        return;
      }
      this.user.set({ id: snap.id, ...snap.data() } as AppUser);
      this.loading.set(false);

      // Charger les articles du vendeur (sans orderBy → pas d'index composite requis)
      this.loadProducts(id);
      this.loadOrders(id);
    } catch (err: any) {
      console.error('[UserDetail] Error:', err?.code, err?.message);
      this.error.set(err?.message ?? 'Erreur Firestore');
      this.loading.set(false);
    }
  }

  private async loadProducts(uid: string): Promise<void> {
    try {
      // sans orderBy pour éviter l'index composite
      const q = query(collection(this.fs, 'product'), where('sellerId', '==', uid), limit(20));
      const snap = await getDocs(q);
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      // tri côté client
      prods.sort((a: any, b: any) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta;
      });
      this.products.set(prods);
    } catch (err: any) {
      console.warn('[UserDetail] loadProducts:', err?.message);
    } finally {
      this.productsLoading.set(false);
    }
  }

  private async loadOrders(uid: string): Promise<void> {
    try {
      const q = query(collection(this.fs, 'order'), where('buyerId', '==', uid), limit(20));
      const snap = await getDocs(q);
      this.orders.set(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (err: any) {
      console.warn('[UserDetail] loadOrders:', err?.message);
    } finally {
      this.ordersLoading.set(false);
    }
  }

  async toggleBan(): Promise<void> {
    const u = this.user();
    if (!u) return;
    const newState = !u.isBanned;
    this.updating.set(true);
    try {
      await this.dataService.banUser(u.id, newState);
      this.user.update(prev => prev ? { ...prev, isBanned: newState } : null);
      this.toast.success(newState ? 'Utilisateur banni' : 'Utilisateur réactivé');
    } catch { this.toast.error('Erreur'); }
    finally { this.updating.set(false); }
  }

  back(): void { this.router.navigate(['/admin/users']); }
  goArticle(id: string): void { this.router.navigate(['/admin/articles', id]); }

  initials(name: string): string {
    return (name ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); }
    catch { return '—'; }
  }
}
