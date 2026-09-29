import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Firestore, collection, query, where, getDocs, orderBy, limit } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent }   from '../../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

// Depuis le changement de circuit (livraison externe), le relais ne gère
// plus le dépôt/inspection/retrait — son seul rôle restant est le
// traitement des litiges signalés par les acheteurs (photos annonce vs
// photos du signalement).
interface RecentNC {
  id: string; productTitle: string; reason: string; status: string; createdAt: any;
}

@Component({
  selector: 'app-relay-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, SkeletonLoaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header [title]="'Bonjour, ' + userName()" subtitle="Litiges à traiter" />

    @if (loading()) {
      <div class="kpi-grid">@for (i of [1,2,3]; track i) { <app-skeleton-loader height="96px" /> }</div>
    } @else {
      <div class="kpi-grid">
        <app-stat-card label="À évaluer"          [value]="toEvaluateCount().toString()" icon="request_quote"   iconBg="#f59e0b" />
        <app-stat-card label="Chez le vendeur"     [value]="awaitingSellerCount().toString()" icon="hourglass_top" iconBg="#6b7f4d" />
        <app-stat-card label="Résolus ce mois-ci"  [value]="resolvedCount().toString()"   icon="check_circle"    iconBg="#16a34a" />
      </div>
    }

    <!-- Litiges récents -->
    <div class="panel">
      <h3 class="panel__title">Litiges récents</h3>
      @if (loading()) {
        @for (i of [1,2,3]; track i) { <app-skeleton-loader height="56px" style="margin-bottom:8px" /> }
      } @else if (recentNCs().length === 0) {
        <div class="empty-sm"><span class="material-icons">check_circle</span><p>Aucun litige en cours. 🎉</p></div>
      } @else {
        @for (nc of recentNCs(); track nc.id) {
          <div class="article-row" style="cursor:pointer" (click)="goToDisputes()">
            <div class="mini-img mini-img--ph"><span class="material-icons">report_problem</span></div>
            <div class="article-info">
              <span class="article-title">{{ nc.productTitle | slice:0:40 }}</span>
              <span class="article-price">{{ nc.reason }}</span>
            </div>
            <app-status-badge [status]="nc.status" />
          </div>
        }
      }
    </div>
  `,
  styleUrl: './relay-dashboard.component.scss'
})
export class RelayDashboardComponent implements OnInit {
  private fs          = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private router       = inject(Router);

  loading             = signal(true);
  toEvaluateCount     = signal(0);
  awaitingSellerCount = signal(0);
  resolvedCount       = signal(0);
  recentNCs           = signal<RecentNC[]>([]);

  userName = () => {
    const name = this.authService.currentUser()?.displayName ?? 'Gestionnaire';
    return name.split(' ')[0];
  };

  goToDisputes(): void {
    this.router.navigate(['/relay/disputes']);
  }

  async ngOnInit(): Promise<void> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const evalQ = query(collection(this.fs, 'non_conformities'), where('status', '==', 'buyer_continue'), limit(100));
      this.toEvaluateCount.set((await getDocs(evalQ)).size);

      const sellerQ = query(collection(this.fs, 'non_conformities'), where('status', '==', 'awaiting_seller_acceptance'), limit(100));
      this.awaitingSellerCount.set((await getDocs(sellerQ)).size);

      const resolvedQ = query(
        collection(this.fs, 'non_conformities'),
        where('status', 'in', ['seller_accepted', 'buyer_refused_avoir', 'buyer_refused_refund']),
        limit(200),
      );
      const resolvedSnap = await getDocs(resolvedQ);
      this.resolvedCount.set(resolvedSnap.docs.filter(d => {
        const createdAt = d.data()['createdAt']?.toDate?.();
        return createdAt && createdAt >= startOfMonth;
      }).length);

      const recentQ = query(collection(this.fs, 'non_conformities'), orderBy('createdAt', 'desc'), limit(10));
      this.recentNCs.set((await getDocs(recentQ)).docs.map(d => ({ id: d.id, ...d.data() } as RecentNC)));

    } catch { } finally { this.loading.set(false); }
  }
}
