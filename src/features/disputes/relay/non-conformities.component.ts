import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, getDocs, addDoc, Timestamp, limit } from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface NC { id: string; productTitle: string; reason: string; description: string; status: string; createdAt: any; }

@Component({
  selector: 'app-non-conformities',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Non-conformités" subtitle="Signaler et suivre les problèmes d'articles">
      <button class="btn btn--primary" (click)="showForm.set(true)">
        <span class="material-icons">add</span> Signaler
      </button>
    </app-page-header>

    <div class="table-card">
      @if (loading()) { <div class="skeleton-list">@for (i of [1,2,3]; track i) { <app-skeleton-loader height="64px" /> }</div> }
      @else if (ncs().length === 0) {
        <div class="empty-state"><span class="material-icons">check_circle</span><p>Aucune non-conformité signalée. Tout va bien ! ✅</p></div>
      } @else {
        @for (nc of ncs(); track nc.id) {
          <div class="nc-row">
            <div class="nc-icon"><span class="material-icons">report_problem</span></div>
            <div class="nc-body">
              <span class="nc-product">{{ nc.productTitle }}</span>
              <span class="nc-reason">{{ nc.reason }}</span>
              @if (nc.description) { <span class="nc-desc">{{ nc.description }}</span> }
              <span class="nc-date">{{ formatDate(nc.createdAt) }}</span>
            </div>
            <app-status-badge [status]="nc.status" />
          </div>
        }
      }
    </div>

    <!-- Form modal -->
    @if (showForm()) {
      <div class="overlay" (click)="showForm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Signaler une non-conformité</h3>
            <button class="btn-close" (click)="showForm.set(false)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="field"><label>Titre de l'article *</label><input type="text" [(ngModel)]="form.productTitle" placeholder="Ex: Robe bleue taille M" /></div>
            <div class="field"><label>Motif *</label>
              <select [(ngModel)]="form.reason">
                <option value="">Choisir...</option>
                <option>Article endommagé</option>
                <option>Ne correspond pas à l'annonce</option>
                <option>Taille incorrecte</option>
                <option>Article manquant</option>
                <option>Autre</option>
              </select>
            </div>
            <div class="field"><label>Description</label><textarea [(ngModel)]="form.description" rows="3" placeholder="Détails supplémentaires..." class="textarea"></textarea></div>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost" (click)="showForm.set(false)">Annuler</button>
            <button class="btn btn--primary" (click)="submitNC()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } Soumettre
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './non-conformities.component.scss'
})
export class NonConformitiesComponent implements OnInit {
  private fs          = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private toast       = inject(ToastService);

  ncs      = signal<NC[]>([]);
  loading  = signal(true);
  showForm = signal(false);
  saving   = signal(false);
  form     = { productTitle: '', reason: '', description: '' };

  async ngOnInit(): Promise<void> {
    try {
      const uid = this.authService.currentUser()?.uid ?? '';
      const q   = query(collection(this.fs, 'non_conformities'), where('relayManagerId', '==', uid), limit(100));
      const s   = await getDocs(q);
      this.ncs.set(s.docs.map(d => ({ id: d.id, ...d.data() } as NC)));
    } catch {} finally { this.loading.set(false); }
  }

  async submitNC(): Promise<void> {
    if (!this.form.productTitle || !this.form.reason) { this.toast.warning('Titre et motif obligatoires'); return; }
    this.saving.set(true);
    try {
      const uid = this.authService.currentUser()?.uid ?? '';
      const ref = await addDoc(collection(this.fs, 'non_conformities'), {
        ...this.form, relayManagerId: uid, status: 'open', createdAt: Timestamp.now(),
      });
      this.ncs.update(list => [{ id: ref.id, ...this.form, status: 'open', createdAt: Timestamp.now() }, ...list]);
      this.form = { productTitle: '', reason: '', description: '' };
      this.showForm.set(false);
      this.toast.success('Non-conformité signalée');
    } catch { this.toast.error('Erreur'); } finally { this.saving.set(false); }
  }

  formatDate(ts: any): string {
    if (!ts) return '—'; try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
