import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, collection, query, where, getDocs, limit } from '@angular/fire/firestore';
import {
  DataService, AppUser, Product, Order,
  getUserName, getUserAvatar, getUserInitials, parseDate
} from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, SkeletonLoaderComponent],
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
      <!-- Hero -->
      <div class="user-hero">
        @if (userAvatar()) {
          <img [src]="userAvatar()" class="hero-avatar" [alt]="userName()" />
        } @else {
          <div class="hero-avatar hero-avatar--initials">{{ userInitials() }}</div>
        }
        <div class="hero-info">
          <h2 class="hero-name">{{ userName() }}</h2>
          <p class="hero-email">{{ user()!.email }}</p>
          @if (user()!.phoneNumber) {
            <p class="hero-email" style="color:var(--color-text-subtle)">☏ {{ user()!.phoneNumber }}</p>
          }
          <div class="hero-meta">
            <span class="tag">Inscrit le {{ fmtDate(user()!.createdAt) }}</span>
            <span class="tag" [class.tag--banned]="isBanned()">
              {{ isBanned() ? '🚫 Banni' : '✅ Actif' }}
            </span>
            @if (user()!.rating) {
              <span class="tag">⭐ {{ user()!.rating | number:'1.1-1' }}</span>
            }
          </div>
          @if (user()!.bio) {
            <p class="hero-bio">{{ user()!.bio }}</p>
          }
        </div>
        <div class="hero-actions">
          <button class="btn"
                  [class.btn--danger]="!isBanned()"
                  [class.btn--success]="isBanned()"
                  (click)="toggleBan()" [disabled]="updating()">
            <span class="material-icons">{{ isBanned() ? 'lock_open' : 'block' }}</span>
            {{ isBanned() ? 'Débannir' : 'Bannir' }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-box">
          <span class="stat-val">{{ products().length }}</span>
          <span class="stat-lbl">Articles publiés</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ soldCount() }}</span>
          <span class="stat-lbl">Vendus</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ orders().length }}</span>
          <span class="stat-lbl">Commandes</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ user()!.reviewCount ?? 0 }}</span>
          <span class="stat-lbl">Avis reçus</span>
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
                  <img [src]="p.imageUrls[0]" class="mini-img" [alt]="p.title" />
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
            Achats ({{ orders().length }})
          </h3>
          @if (ordersLoading()) {
            <app-skeleton-loader height="48px" />
          } @else if (orders().length === 0) {
            <p class="text-muted">Aucun achat effectué.</p>
          } @else {
            @for (o of orders().slice(0, 8); track o.id) {
              <div class="mini-row">
                <div class="mini-img mini-img--ph">
                  <span class="material-icons">receipt</span>
                </div>
                <div class="mini-info">
                  <span class="mini-title">{{ o.productTitle | slice:0:30 }}</span>
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

  // ── Helpers Flutter-compatible ────────────────────────────────────────────
  userName    = () => getUserName(this.user());
  userAvatar  = () => getUserAvatar(this.user());
  userInitials = () => getUserInitials(this.user());
  isBanned    = () => this.user()?.isBanned === true || this.user()?.isActive === false;
  soldCount   = () => this.products().filter(p => p.status === 'sold').length;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('ID manquant'); this.loading.set(false); return; }

    try {
      const snap = await getDoc(doc(this.fs, 'users', id));
      if (!snap.exists()) { this.error.set('Utilisateur introuvable'); this.loading.set(false); return; }
      this.user.set({ id: snap.id, ...snap.data() } as AppUser);
      this.loading.set(false);
      this.loadProducts(id);
      this.loadOrders(id);
    } catch (err: any) {
      console.error('[UserDetail]', err?.code, err?.message);
      this.error.set(err?.message ?? 'Erreur Firestore');
      this.loading.set(false);
    }
  }

  private async loadProducts(uid: string): Promise<void> {
    try {
      const snap = await getDocs(query(collection(this.fs, 'product'), where('sellerId', '==', uid), limit(20)));
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      prods.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      this.products.set(prods);
    } catch (err: any) { console.warn('[UserDetail] products:', err?.message); }
    finally { this.productsLoading.set(false); }
  }

  private async loadOrders(uid: string): Promise<void> {
    try {
      const snap = await getDocs(query(collection(this.fs, 'order'), where('buyerId', '==', uid), limit(20)));
      this.orders.set(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (err: any) { console.warn('[UserDetail] orders:', err?.message); }
    finally { this.ordersLoading.set(false); }
  }

  async toggleBan(): Promise<void> {
    const u = this.user();
    if (!u) return;
    const newState = !this.isBanned();
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

  fmtDate(ts: any): string {
    const d = parseDate(ts);
    return d ? d.toLocaleDateString('fr-FR') : '—';
  }
}
