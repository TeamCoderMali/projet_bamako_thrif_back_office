import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, getCountFromServer } from '@angular/fire/firestore';
import { StatCardComponent }    from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent }  from '../../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface KPI { users: number; articles: number; available: number; sold: number; revenue: number; disputes: number; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, PageHeaderComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Dashboard" subtitle="Vue d'ensemble de la plateforme DANAYA" />

    @if (loading()) {
      <div class="kpi-grid">
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="kpi-skeleton">
            <app-skeleton-loader height="100px" />
          </div>
        }
      </div>
    } @else {
      <div class="kpi-grid">
        <app-stat-card label="Utilisateurs"    [value]="kpi().users.toString()"     icon="group"           iconBg="var(--color-primary)" />
        <app-stat-card label="Articles total"  [value]="kpi().articles.toString()"  icon="checkroom"       iconBg="var(--color-info)" />
        <app-stat-card label="Disponibles"     [value]="kpi().available.toString()" icon="storefront"      iconBg="var(--color-success)" />
        <app-stat-card label="Vendus"          [value]="kpi().sold.toString()"      icon="shopping_cart"   iconBg="#7c3aed" />
        <app-stat-card label="Revenus"         [value]="kpi().revenue + ' FCFA'"    icon="account_balance" iconBg="#ea580c" />
        <app-stat-card label="Litiges ouverts" [value]="kpi().disputes.toString()"  icon="gavel"           iconBg="var(--color-danger)" />
      </div>
    }

    <div class="section-grid">
      <div class="card">
        <h3 class="card__title">Activité récente</h3>
        <p class="coming-soon">Les données seront chargées depuis Firestore.</p>
      </div>
      <div class="card">
        <h3 class="card__title">Notifications</h3>
        <p class="coming-soon">Aucune notification pour l'instant.</p>
      </div>
    </div>
  `,
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private firestore: Firestore = inject(Firestore);

  loading = signal(true);
  kpi     = signal<KPI>({ users: 0, articles: 0, available: 0, sold: 0, revenue: 0, disputes: 0 });

  async ngOnInit(): Promise<void> {
    try {
      const [usersSnap, articlesSnap] = await Promise.all([
        getCountFromServer(collection(this.firestore, 'users')),
        getCountFromServer(collection(this.firestore, 'product')),
      ]);
      this.kpi.set({
        users:     usersSnap.data().count,
        articles:  articlesSnap.data().count,
        available: 0,
        sold:      0,
        revenue:   0,
        disputes:  0,
      });
    } catch {
      // Firestore permissions may block — will work once admin_users rules are set
    } finally {
      this.loading.set(false);
    }
  }
}
