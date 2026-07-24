import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, AppUser } from '../../../core/services/data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Utilisateurs" subtitle="Gestion de la communauté DANAYA">
      <span class="stat-pill stat-pill--green">{{ users().length }} membres</span>
    </app-page-header>

    <div class="filters-bar">
      <div class="search-wrap">
        <span class="material-icons">search</span>
        <input type="text" placeholder="Nom, email..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous</option>
        <option value="active">Actifs</option>
        <option value="banned">Bannis</option>
      </select>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3,4,5]; track i) { <app-skeleton-loader height="60px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state"><span class="material-icons">group_off</span><p>Aucun utilisateur.</p></div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Statut</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of filtered(); track u.id) {
              <tr>
                <td>
                  <div class="user-cell">
                    @if (u.photoURL) {
                      <img [src]="u.photoURL" class="user-avatar" [alt]="u.displayName" />
                    } @else {
                      <div class="user-avatar user-avatar--initials">{{ initials(u.displayName) }}</div>
                    }
                    <span class="user-name">{{ u.displayName || '—' }}</span>
                  </div>
                </td>
                <td class="text-muted">{{ u.email }}</td>
                <td>
                  <span class="status-pill" [class.banned]="u.isBanned">
                    <span class="status-dot"></span>
                    {{ u.isBanned ? 'Banni' : 'Actif' }}
                  </span>
                </td>
                <td class="text-muted">{{ formatDate(u.createdAt) }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon" (click)="goDetail(u.id)" title="Voir profil">
                      <span class="material-icons">open_in_new</span>
                    </button>
                    <button class="btn-icon" [class.btn-icon--danger]="!u.isBanned"
                            [class.btn-icon--success]="u.isBanned"
                            (click)="toggleBan(u)"
                            [title]="u.isBanned ? 'Débannir' : 'Bannir'">
                      <span class="material-icons">{{ u.isBanned ? 'lock_open' : 'block' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="table-footer">{{ filtered().length }} / {{ users().length }} utilisateurs</div>
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
  searchQuery  = '';
  filterStatus = '';

  filtered = computed(() => {
    let list = this.users();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(u => u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (this.filterStatus === 'banned') list = list.filter(u => u.isBanned);
    if (this.filterStatus === 'active') list = list.filter(u => !u.isBanned);
    return list;
  });

  ngOnInit(): void {
    this.dataService.getUsers(500).subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Erreur de chargement'); },
    });
  }

  async toggleBan(user: AppUser): Promise<void> {
    const newState = !user.isBanned;
    try {
      await this.dataService.banUser(user.id, newState);
      this.users.update(list => list.map(u => u.id === user.id ? { ...u, isBanned: newState } : u));
      this.toast.success(newState ? `${user.displayName} a été banni` : `${user.displayName} est réactivé`);
    } catch { this.toast.error('Erreur lors du bannissement'); }
  }

  goDetail(id: string): void { this.router.navigate(['/admin/users', id]); }

  initials(name: string): string {
    return (name ?? '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); }
    catch { return '—'; }
  }
}
