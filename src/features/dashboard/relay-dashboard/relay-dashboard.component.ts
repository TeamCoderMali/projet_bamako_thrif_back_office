import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, where, getDocs, limit } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent }   from '../../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

interface RelayArticle {
  id: string; title: string; price: number; status: string;
  imageUrls: string[]; createdAt: any;
}

@Component({
  selector: 'app-relay-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, SkeletonLoaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header [title]="'Bonjour, ' + userName()" subtitle="Tableau de bord de votre point relais" />

    @if (loading()) {
      <div class="kpi-grid">@for (i of [1,2,3]; track i) { <app-skeleton-loader height="96px" /> }</div>
    } @else {
      <div class="kpi-grid">
        <app-stat-card label="Articles en attente" [value]="pendingCount().toString()" icon="inventory_2"     iconBg="#f59e0b" />
        <app-stat-card label="Reçus aujourd'hui"   [value]="todayCount().toString()"  icon="check_circle"    iconBg="#16a34a" />
        <app-stat-card label="Non-conformités"     [value]="ncCount().toString()"     icon="report_problem"  iconBg="#dc2626" />
      </div>
    }

    <!-- Articles récents -->
    <div class="panel">
      <h3 class="panel__title">Articles récents</h3>
      @if (loading()) {
        @for (i of [1,2,3]; track i) { <app-skeleton-loader height="56px" style="margin-bottom:8px" /> }
      } @else if (recentArticles().length === 0) {
        <div class="empty-sm"><span class="material-icons">inbox</span><p>Aucun article assigné à ce relais.</p></div>
      } @else {
        @for (a of recentArticles(); track a.id) {
          <div class="article-row">
            @if (a.imageUrls?.[0]) { <img [src]="a.imageUrls[0]" class="mini-img" /> }
            @else { <div class="mini-img mini-img--ph"><span class="material-icons">image</span></div> }
            <div class="article-info">
              <span class="article-title">{{ a.title | slice:0:40 }}</span>
              <span class="article-price">{{ a.price | number:'1.0-0' }} FCFA</span>
            </div>
            <app-status-badge [status]="a.status" />
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

  loading        = signal(true);
  pendingCount   = signal(0);
  todayCount     = signal(0);
  ncCount        = signal(0);
  recentArticles = signal<RelayArticle[]>([]);

  userName = () => {
    const name = this.authService.currentUser()?.displayName ?? 'Gestionnaire';
    return name.split(' ')[0];
  };

  async ngOnInit(): Promise<void> {
    const uid = this.authService.currentUser()?.uid;
    try {
      // Articles en attente (pending ou reserved au relais)
      const pq = query(collection(this.fs, 'product'), where('status', '==', 'reserved'), limit(50));
      const ps = await getDocs(pq);
      this.pendingCount.set(ps.size);

      // Articles récents
      const rq = query(collection(this.fs, 'product'), limit(10));
      const rs = await getDocs(rq);
      this.recentArticles.set(rs.docs.map(d => ({ id: d.id, ...d.data() } as RelayArticle)));

      // NCs
      const ncq = query(collection(this.fs, 'non_conformities'), where('relayManagerId', '==', uid ?? ''), limit(50));
      const ncs = await getDocs(ncq);
      this.ncCount.set(ncs.size);

    } catch { } finally { this.loading.set(false); }
  }
}
