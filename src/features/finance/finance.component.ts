import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, orderBy, getDocs, limit, where } from '@angular/fire/firestore';
import { PageHeaderComponent }     from '../../shared/components/page-header/page-header.component';
import { StatCardComponent }       from '../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

interface Transaction {
  id: string; userId: string; type: string;
  amount: number; description: string; createdAt: any;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Finances" subtitle="Suivi des revenus et transactions de la plateforme" />

    @if (error()) {
      <div class="error-box">
        <span class="material-icons">error_outline</span>
        <p>{{ error() }}</p>
        <button class="btn-retry" (click)="load()">Réessayer</button>
      </div>
    }

    <!-- KPI Row -->
    @if (loading()) {
      <div class="kpi-grid">@for (i of [1,2,3,4]; track i) { <app-skeleton-loader height="100px" /> }</div>
    } @else {
      <div class="kpi-grid">
        <app-stat-card label="Revenus totaux"       [value]="fmt(totalRevenue())"        icon="account_balance" iconBg="#6B7F4D" />
        <app-stat-card label="Portefeuilles actifs" [value]="walletCount().toString()"   icon="account_circle"  iconBg="#2563eb" />
        <app-stat-card label="Commandes totales"    [value]="orderCount().toString()"    icon="shopping_cart"   iconBg="#7c3aed" />
        <app-stat-card label="Valeur moy. commande" [value]="fmt(avgOrderValue())"       icon="payments"        iconBg="#ea580c" />
      </div>
    }

    <div class="section-grid">
      <!-- Transactions récentes -->
      <div class="panel">
        <h3 class="panel__title">Transactions récentes</h3>
        @if (loading()) {
          @for (i of [1,2,3,4,5]; track i) { <app-skeleton-loader height="52px" style="margin-bottom:8px" /> }
        } @else if (transactions().length === 0) {
          <div class="empty-state-sm">
            <span class="material-icons">receipt_long</span>
            <p>Aucune transaction enregistrée.</p>
            <small>Les transactions sont créées par l'application mobile.</small>
          </div>
        } @else {
          @for (tx of transactions(); track tx.id) {
            <div class="tx-row">
              <div class="tx-icon" [class.credit]="tx.type === 'credit'" [class.debit]="tx.type === 'debit'" [class.refund]="tx.type === 'refund'">
                <span class="material-icons">{{ tx.type === 'credit' ? 'arrow_downward' : tx.type === 'refund' ? 'undo' : 'arrow_upward' }}</span>
              </div>
              <div class="tx-info">
                <span class="tx-desc">{{ tx.description || 'Transaction' }}</span>
                <span class="tx-date">{{ formatDate(tx.createdAt) }}</span>
              </div>
              <span class="tx-amount" [class.credit]="tx.type === 'credit'" [class.debit]="tx.type !== 'credit'">
                {{ tx.type === 'credit' ? '+' : '-' }}{{ tx.amount | number:'1.0-0' }} FCFA
              </span>
            </div>
          }
        }
      </div>

      <!-- Commandes par statut -->
      <div class="panel">
        <h3 class="panel__title">Commandes par statut</h3>
        @if (loading()) {
          @for (i of [1,2,3]; track i) { <app-skeleton-loader height="40px" style="margin-bottom:8px" /> }
        } @else if (orderStats().length === 0) {
          <div class="empty-state-sm">
            <span class="material-icons">receipt</span>
            <p>Aucune commande.</p>
          </div>
        } @else {
          @for (stat of orderStats(); track stat.label) {
            <div class="order-stat-row">
              <div class="order-stat-label">
                <span class="dot" [style.background]="stat.color"></span>
                {{ stat.label }}
              </div>
              <div class="order-stat-bar-wrap">
                <div class="order-stat-bar" [style.width.%]="stat.pct" [style.background]="stat.color"></div>
              </div>
              <span class="order-stat-count">{{ stat.count }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './finance.component.scss'
})
export class FinanceComponent implements OnInit {
  private fs = inject(Firestore);

  loading      = signal(true);
  error        = signal('');
  totalRevenue = signal(0);
  walletCount  = signal(0);
  orderCount   = signal(0);
  avgOrderValue = signal(0);
  transactions = signal<Transaction[]>([]);
  orderStats   = signal<{ label: string; count: number; pct: number; color: string }[]>([]);

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [ordersSnap, walletsSnap, txSnap] = await Promise.all([
        getDocs(query(collection(this.fs, 'order'), limit(500))),
        getDocs(query(collection(this.fs, 'wallet'), limit(500))),
        getDocs(query(collection(this.fs, 'transactions'), orderBy('createdAt', 'desc'), limit(20))).catch(() =>
          getDocs(query(collection(this.fs, 'transactions'), limit(20)))
        ),
      ]);

      // KPIs
      let orderTotal = 0;
      const orderStatusCounts: Record<string, number> = {};
      ordersSnap.forEach(d => {
        const data = d.data() as any;
        orderTotal += data['totalAmount'] ?? 0;
        const s = data['status'] ?? 'unknown';
        orderStatusCounts[s] = (orderStatusCounts[s] ?? 0) + 1;
      });
      this.orderCount.set(ordersSnap.size);
      this.avgOrderValue.set(ordersSnap.size > 0 ? Math.round(orderTotal / ordersSnap.size) : 0);

      let walletTotal = 0;
      walletsSnap.forEach(d => { walletTotal += (d.data() as any)['totalEarned'] ?? 0; });
      this.totalRevenue.set(walletTotal);
      this.walletCount.set(walletsSnap.size);

      // Transactions
      this.transactions.set(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

      // Order stats bars
      const total = ordersSnap.size || 1;
      const colorMap: Record<string, string> = {
        pending: '#f59e0b', processing: '#2563eb', delivered: '#16a34a',
        cancelled: '#dc2626', completed: '#6B7F4D',
      };
      const labelMap: Record<string, string> = {
        pending: 'En attente', processing: 'En cours', delivered: 'Livré',
        cancelled: 'Annulé', completed: 'Complété',
      };
      const stats = Object.entries(orderStatusCounts)
        .map(([key, count]) => ({
          label: labelMap[key] ?? key,
          count,
          pct: Math.round((count / total) * 100),
          color: colorMap[key] ?? '#6b7280',
        }))
        .sort((a, b) => b.count - a.count);
      this.orderStats.set(stats);

    } catch (err: any) {
      console.error('[Finance] load error:', err?.code, err?.message);
      this.error.set(`Erreur : ${err?.message ?? 'Accès Firestore refusé'}`);
    } finally {
      this.loading.set(false);
    }
  }

  fmt(v: number): string { return v.toLocaleString('fr-FR') + ' FCFA'; }
  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); }
    catch { return '—'; }
  }
}
