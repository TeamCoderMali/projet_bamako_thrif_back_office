import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataService, AppUser,
  getUserName, getUserAvatar, getUserInitials, parseDate
} from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Utilisateurs" subtitle="Gestion de la communauté DANAYA">
      <span class="stat-pill">{{ users().length }} membres</span>
    </app-page-header>

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Nom, email..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous les statuts</option>
        <option value="active">✅ Actifs</option>
        <option value="banned">🚫 Bannis</option>
      </select>
      <button class="btn-reset" (click)="searchQuery='';filterStatus=''" title="Réinitialiser">
        <span class="material-icons">refresh</span>
      </button>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3,4,5,6]; track i) { <app-skeleton-loader height="60px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <span class="material-icons">manage_accounts</span>
          <p>Aucun utilisateur trouvé.</p>
        </div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Statut</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of paged(); track u.id) {
              <tr (click)="goDetail(u.id)">
                <td>
                  <div class="user-cell">
                    @if (avatar(u)) {
                      <img [src]="avatar(u)" class="user-avatar" [alt]="name(u)" />
                    } @else {
                      <div class="user-avatar user-avatar--initials">{{ initials(u) }}</div>
                    }
                    <div class="user-info">
                      <span class="user-name">{{ name(u) }}</span>
                      @if (u.totalListings) {
                        <span class="user-sub">{{ u.totalListings }} article(s)</span>
                      }
                    </div>
                  </div>
                </td>
                <td class="text-muted">{{ u.email }}</td>
                <td class="text-muted">{{ u.phoneNumber || '—' }}</td>
                <td>
                  <span class="status-pill" [class.banned]="isBanned(u)">
                    <span class="status-dot"></span>
                    {{ isBanned(u) ? 'Banni' : 'Actif' }}
                  </span>
                </td>
                <td class="text-muted">{{ formatDate(u.createdAt) }}</td>
                <td>
                  <div class="actions" (click)="$event.stopPropagation()">
                    <!-- Voir le profil -->
                    <button class="btn-action btn-action--view" (click)="goDetail(u.id)" title="Voir profil">
                      <span class="material-icons">person_search</span>
                    </button>
                    <!-- Bannir / Débannir -->
                    <button
                      class="btn-action"
                      [class.btn-action--warn]="!isBanned(u)"
                      [class.btn-action--unlock]="isBanned(u)"
                      (click)="toggleBan(u)"
                      [title]="isBanned(u) ? 'Débannir' : 'Bannir'">
                      <span class="material-icons">{{ isBanned(u) ? 'lock_open' : 'block' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <!-- Pagination -->
        <div class="table-footer">
          <span>{{ filtered().length }} / {{ users().length }} utilisateurs</span>
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="prevPage()">
              <span class="material-icons">chevron_left</span>
            </button>
            <span class="page-info">Page {{ page() }} / {{ totalPages() }}</span>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="nextPage()">
              <span class="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  private dataService = inject(DataService);
  private toast       = inject(ToastService);
  private router      = inject(Router);

  users        = signal<AppUser[]>([]);
  loading      = signal(true);
  page         = signal(1);
  readonly pageSize = 20;
  searchQuery  = '';
  filterStatus = '';

  // ── Helpers champs Flutter ────────────────────────────────────────────────
  name    = (u: AppUser) => getUserName(u);
  avatar  = (u: AppUser) => getUserAvatar(u);
  initials = (u: AppUser) => getUserInitials(u);
  isBanned = (u: AppUser) => u.isBanned === true || u.isActive === false;

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase();
    let list = this.users().filter(u => {
      const n = getUserName(u).toLowerCase();
      const e = (u.email ?? '').toLowerCase();
      return !q || n.includes(q) || e.includes(q);
    });
    if (this.filterStatus === 'banned')  list = list.filter(u => this.isBanned(u));
    if (this.filterStatus === 'active')  list = list.filter(u => !this.isBanned(u));
    return list;
  });

  paged      = computed(() => this.filtered().slice((this.page()-1)*this.pageSize, this.page()*this.pageSize));
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  prevPage(): void { this.page.update(p => p - 1); }
  nextPage(): void { this.page.update(p => p + 1); }

  ngOnInit(): void {
    this.dataService.getUsers(500).subscribe({
      next:  (data) => { this.users.set(data); this.loading.set(false); },
      error: ()     => { this.loading.set(false); this.toast.error('Erreur de chargement'); },
    });
  }

  async toggleBan(user: AppUser): Promise<void> {
    const newState = !this.isBanned(user);
    try {
      await this.dataService.banUser(user.id, newState);
      this.users.update(list => list.map(u => u.id === user.id ? { ...u, isBanned: newState } : u));
      this.toast.success(newState ? `${getUserName(user)} a été banni` : `${getUserName(user)} est réactivé`);
    } catch { this.toast.error('Erreur lors du bannissement'); }
  }

  goDetail(id: string): void { this.router.navigate(['/admin/users', id]); }

  formatDate(ts: any): string {
    const d = parseDate(ts);
    return d ? d.toLocaleDateString('fr-FR') : '—';
  }
}
