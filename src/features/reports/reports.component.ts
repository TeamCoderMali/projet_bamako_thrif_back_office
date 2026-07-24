import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, getDocs, query, where, limit } from '@angular/fire/firestore';
import { PageHeaderComponent }     from '../../shared/components/page-header/page-header.component';
import { StatCardComponent }       from '../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

interface ChartBar { label: string; value: number; pct: number; color: string; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Statistiques & Rapports" subtitle="Vue analytique de la plateforme DANAYA" />

    @if (error()) {
      <div class="error-box">
        <span class="material-icons">error_outline</span>
        <p>{{ error() }}</p>
        <button class="btn-retry" (click)="load()">Réessayer</button>
      </div>
    }

    <!-- Global KPIs -->
    @if (loading()) {
      <div class="kpi-grid">@for (i of [1,2,3,4,5,6]; track i) { <app-skeleton-loader height="96px" /> }</div>
    } @else {
      <div class="kpi-grid">
        <app-stat-card label="Utilisateurs"    [value]="stats().users.toString()"        icon="group"          iconBg="#6B7F4D" />
        <app-stat-card label="Articles total"  [value]="stats().articles.toString()"     icon="checkroom"      iconBg="#2563eb" />
        <app-stat-card label="Disponibles"     [value]="stats().available.toString()"    icon="storefront"     iconBg="#16a34a" />
        <app-stat-card label="Vendus"          [value]="stats().sold.toString()"         icon="local_offer"    iconBg="#7c3aed" />
        <app-stat-card label="Commandes"       [value]="stats().orders.toString()"       icon="receipt"        iconBg="#ea580c" />
        <app-stat-card label="Points relais"   [value]="stats().relayCenters.toString()" icon="store"          iconBg="#0891b2" />
      </div>
    }

    <div class="charts-grid">
      <!-- Articles par statut -->
      <div class="chart-card">
        <h3 class="chart-title">
          <span class="material-icons">pie_chart</span> Articles par statut
        </h3>
        @if (loading()) { <app-skeleton-loader height="160px" /> }
        @else if (articleBars().length === 0) {
          <p class="text-muted">Aucune donnée.</p>
        } @else {
          <div class="bar-chart">
            @for (bar of articleBars(); track bar.label) {
              <div class="bar-row">
                <span class="bar-label">{{ bar.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="bar.pct" [style.background]="bar.color"
                       style="transition: width 0.7s cubic-bezier(0.4,0,0.2,1)"></div>
                </div>
                <span class="bar-value">{{ bar.value }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Top catégories -->
      <div class="chart-card">
        <h3 class="chart-title">
          <span class="material-icons">category</span> Top catégories
        </h3>
        @if (loading()) { <app-skeleton-loader height="160px" /> }
        @else if (categoryBars().length === 0) {
          <p class="text-muted">Aucune catégorie trouvée.</p>
        } @else {
          <div class="bar-chart">
            @for (bar of categoryBars(); track bar.label) {
              <div class="bar-row">
                <span class="bar-label">{{ bar.label | slice:0:18 }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="bar.pct" [style.background]="bar.color"
                       style="transition: width 0.7s cubic-bezier(0.4,0,0.2,1)"></div>
                </div>
                <span class="bar-value">{{ bar.value }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Taux de conversion (donut) -->
      <div class="chart-card">
        <h3 class="chart-title">
          <span class="material-icons">trending_up</span> Taux de vente
        </h3>
        @if (loading()) { <app-skeleton-loader height="160px" /> }
        @else {
          <div class="donut-layout">
            <div class="donut-wrap">
              <svg viewBox="0 0 100 100" class="donut-svg">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" stroke-width="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#6B7F4D" stroke-width="10"
                        [attr.stroke-dasharray]="conversionArc() + ' 251.2'"
                        stroke-dashoffset="62.8" stroke-linecap="round" />
              </svg>
              <div class="donut-label">
                <span class="donut-pct">{{ conversionPct() }}%</span>
                <span class="donut-sub">vendus</span>
              </div>
            </div>
            <div class="donut-legend">
              <div class="legend-item"><span class="legend-dot" style="background:#6B7F4D"></span>Vendus ({{ stats().sold }})</div>
              <div class="legend-item"><span class="legend-dot" style="background:#16a34a"></span>Disponibles ({{ stats().available }})</div>
              <div class="legend-item"><span class="legend-dot" style="background:#6b7280"></span>Autres ({{ stats().articles - stats().sold - stats().available }})</div>
            </div>
          </div>
        }
      </div>

      <!-- Résumé plateforme -->
      <div class="chart-card">
        <h3 class="chart-title">
          <span class="material-icons">analytics</span> Résumé plateforme
        </h3>
        <div class="summary-list">
          <div class="summary-row">
            <span class="material-icons summary-icon" style="color:#6B7F4D">trending_up</span>
            <div>
              <p class="summary-label">Taux de vente</p>
              <p class="summary-value">{{ conversionPct() }}% des articles publiés sont vendus</p>
            </div>
          </div>
          <div class="summary-row">
            <span class="material-icons summary-icon" style="color:#2563eb">people</span>
            <div>
              <p class="summary-label">Engagement</p>
              <p class="summary-value">
                {{ stats().users > 0 ? (stats().articles / stats().users).toFixed(1) : '0' }} articles / utilisateur
              </p>
            </div>
          </div>
          <div class="summary-row">
            <span class="material-icons summary-icon" style="color:#ea580c">local_shipping</span>
            <div>
              <p class="summary-label">Logistique</p>
              <p class="summary-value">{{ stats().relayCenters }} point(s) relais configurés</p>
            </div>
          </div>
          <div class="summary-row">
            <span class="material-icons summary-icon" style="color:#dc2626">gavel</span>
            <div>
              <p class="summary-label">Litiges</p>
              <p class="summary-value">{{ stats().openDisputes }} litige(s) ouvert(s)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private fs = inject(Firestore);

  loading = signal(true);
  error   = signal('');
  stats   = signal({
    users: 0, articles: 0, available: 0, sold: 0,
    orders: 0, relayCenters: 0, openDisputes: 0,
  });
  articleBars  = signal<ChartBar[]>([]);
  categoryBars = signal<ChartBar[]>([]);

  conversionPct = () => {
    const s = this.stats();
    return s.articles > 0 ? Math.round((s.sold / s.articles) * 100) : 0;
  };
  conversionArc = () => Math.round(this.conversionPct() / 100 * 251.2 * 10) / 10;

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      // Toutes les requêtes en parallèle — utilise getDocs().size (pas getCountFromServer)
      const [
        usersSnap, productsSnap, ordersSnap,
        availableSnap, soldSnap,
        relaysSnap, disputesSnap
      ] = await Promise.all([
        getDocs(query(collection(this.fs, 'users'),         limit(1000))),
        getDocs(query(collection(this.fs, 'product'),       limit(1000))),
        getDocs(query(collection(this.fs, 'order'),         limit(1000))),
        getDocs(query(collection(this.fs, 'product'),       where('status', '==', 'available'), limit(500))),
        getDocs(query(collection(this.fs, 'product'),       where('status', '==', 'sold'),      limit(500))),
        getDocs(query(collection(this.fs, 'relay_centers'), limit(200))),
        getDocs(query(collection(this.fs, 'disputes'),      where('status', '==', 'open'),      limit(200))),
      ]);

      const articles  = productsSnap.size;
      const available = availableSnap.size;
      const sold      = soldSnap.size;

      this.stats.set({
        users: usersSnap.size,
        articles,
        available,
        sold,
        orders: ordersSnap.size,
        relayCenters: relaysSnap.size,
        openDisputes: disputesSnap.size,
      });

      // Barres par statut
      const other = Math.max(0, articles - available - sold);
      const maxSt = Math.max(available, sold, other, 1);
      this.articleBars.set([
        { label: 'Disponibles', value: available, pct: Math.round(available / maxSt * 100), color: '#16a34a' },
        { label: 'Vendus',      value: sold,      pct: Math.round(sold      / maxSt * 100), color: '#6B7F4D' },
        { label: 'Autres',      value: other,     pct: Math.round(other     / maxSt * 100), color: '#6b7280' },
      ]);

      // Barres par catégorie
      const cats: Record<string, number> = {};
      productsSnap.forEach(d => {
        const c = (d.data() as any)['category'] ?? 'Non catégorisé';
        cats[c] = (cats[c] ?? 0) + 1;
      });
      const sorted   = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const maxCat   = sorted[0]?.[1] ?? 1;
      const colors   = ['#6B7F4D','#2563eb','#7c3aed','#ea580c','#0891b2','#16a34a'];
      this.categoryBars.set(sorted.map(([label, value], i) => ({
        label, value, pct: Math.round(value / maxCat * 100), color: colors[i % colors.length],
      })));

    } catch (err: any) {
      console.error('[Reports] load error:', err?.code, err?.message);
      this.error.set(`Erreur : ${err?.message ?? 'Accès Firestore refusé'}`);
    } finally {
      this.loading.set(false);
    }
  }
}
