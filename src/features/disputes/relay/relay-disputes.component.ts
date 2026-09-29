import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, where, orderBy, collectionData, doc, updateDoc, addDoc, Timestamp } from '@angular/fire/firestore';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

// Seul rôle restant du relais depuis le nouveau circuit de livraison :
// traiter les litiges signalés par les acheteurs, en comparant les photos
// de l'annonce initiale (déjà en ligne) aux photos envoyées par l'acheteur.
interface NC {
  id: string; productTitle: string; reason: string; description?: string;
  photoUrls?: string[]; listingPhotoUrls?: string[];
  sellerId?: string; buyerId?: string; orderId?: string;
  status: string; repairCost?: number; createdAt: any;
}

@Component({
  selector: 'app-relay-disputes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatusBadgeComponent, SkeletonLoaderComponent],
  template: `
    <app-page-header title="Litiges" subtitle="Comparaison photos annonce / signalement acheteur" />

    <div class="filters-bar">
      <select [(ngModel)]="filterStatus" class="filter-select">
        <option value="">Tous</option>
        <option value="buyer_continue">À évaluer</option>
        <option value="awaiting_seller_acceptance">Chez le vendeur</option>
        <option value="seller_accepted">Résolu (dédommagement accepté)</option>
        <option value="buyer_refused_avoir">Annulé (avoir)</option>
        <option value="buyer_refused_refund">Annulé (remboursement)</option>
      </select>
    </div>

    <div class="table-card">
      @if (loading()) {
        <div class="skeleton-list">@for (i of [1,2,3]; track i) { <app-skeleton-loader height="120px" /> }</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state"><span class="material-icons">check_circle</span><p>Aucun litige. 🎉</p></div>
      } @else {
        <div class="disputes-list">
          @for (nc of filtered(); track nc.id) {
            <div class="dispute-card" [class.open]="nc.status === 'buyer_continue'">
              <div class="dispute-card__left">
                <div class="dispute-icon" [class.urgent]="nc.status === 'buyer_continue'">
                  <span class="material-icons">compare</span>
                </div>
              </div>
              <div class="dispute-card__body">
                <div class="dispute-header">
                  <span class="dispute-product">{{ nc.productTitle }}</span>
                  <app-status-badge [status]="nc.status" />
                </div>
                <p class="dispute-reason"><strong>Motif :</strong> {{ nc.reason }}</p>
                @if (nc.description) { <p class="dispute-desc">{{ nc.description }}</p> }

                <!-- Comparaison photos -->
                <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;">
                  <div>
                    <p style="font-size:11px;color:#888;margin-bottom:4px;">Photo annonce</p>
                    <div style="display:flex;gap:6px;">
                      @for (url of nc.listingPhotoUrls; track url) {
                        <img [src]="url" style="width:56px;height:56px;object-fit:cover;border-radius:6px;" />
                      }
                    </div>
                  </div>
                  <div>
                    <p style="font-size:11px;color:#888;margin-bottom:4px;">Photo signalement (acheteur)</p>
                    <div style="display:flex;gap:6px;">
                      @for (url of nc.photoUrls; track url) {
                        <img [src]="url" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid #dc2626;" />
                      }
                    </div>
                  </div>
                </div>

                @if (nc.repairCost) {
                  <p class="dispute-resolution" style="margin-top:8px;">
                    <span class="material-icons">payments</span> Coût évalué : {{ nc.repairCost }} FCFA
                  </p>
                }
                <p class="dispute-date">Signalé le {{ formatDate(nc.createdAt) }}</p>
              </div>
              <div class="dispute-card__actions">
                @if (nc.status === 'buyer_continue') {
                  <button class="btn btn--sm btn--orange" (click)="openEvaluate(nc)">
                    <span class="material-icons">request_quote</span> Évaluer le coût
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal évaluation -->
    @if (evaluateTarget()) {
      <div class="overlay" (click)="evaluateTarget.set(null)">
        <div class="resolve-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Évaluer le coût de remise en état</h3>
            <button class="btn-close" (click)="evaluateTarget.set(null)"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <div class="dispute-summary">
              <p><strong>Article :</strong> {{ evaluateTarget()!.productTitle }}</p>
              <p><strong>Motif :</strong> {{ evaluateTarget()!.reason }}</p>
            </div>
            <div class="field">
              <label>Montant à la charge du vendeur (FCFA) *</label>
              <input type="number" [(ngModel)]="repairCost" min="0" step="100"
                     placeholder="Ex: 2000" class="search-input" style="width:100%;" />
            </div>
            <p style="font-size:12px;color:#888;margin-top:8px;">
              Le vendeur recevra une notification et aura 24h pour accepter ce montant.
            </p>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost" (click)="evaluateTarget.set(null)">Annuler</button>
            <button class="btn btn--success" (click)="submitEvaluation()" [disabled]="saving() || !repairCost || repairCost <= 0">
              @if (saving()) { <span class="spinner"></span> } Envoyer au vendeur
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: '../../disputes/disputes.component.scss'
})
export class RelayDisputesComponent implements OnInit {
  private fs    = inject(Firestore);
  private toast = inject(ToastService);

  ncs            = signal<NC[]>([]);
  loading        = signal(true);
  filterStatus   = '';
  evaluateTarget = signal<NC | null>(null);
  repairCost: number | null = null;
  saving         = signal(false);

  filtered = computed(() => {
    let list = this.ncs();
    if (this.filterStatus) list = list.filter(n => n.status === this.filterStatus);
    return list;
  });

  ngOnInit(): void {
    const q = query(collection(this.fs, 'non_conformities'), orderBy('createdAt', 'desc'));
    (collectionData(q, { idField: 'id' }) as any).subscribe({
      next: (data: NC[]) => { this.ncs.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openEvaluate(nc: NC): void { this.evaluateTarget.set(nc); this.repairCost = null; }

  async submitEvaluation(): Promise<void> {
    const nc = this.evaluateTarget();
    if (!nc || !this.repairCost || this.repairCost <= 0) return;
    this.saving.set(true);
    try {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24);

      await updateDoc(doc(this.fs, 'non_conformities', nc.id), {
        status: 'awaiting_seller_acceptance',
        repairCost: this.repairCost,
        sellerDeadline: Timestamp.fromDate(deadline),
        evaluatedAt: Timestamp.now(),
      });

      if (nc.sellerId) {
        await addDoc(collection(this.fs, 'notification'), {
          userId: nc.sellerId,
          type: 'repairValidation',
          title: 'Remise en état requise',
          body: `Un montant de ${this.repairCost} FCFA a été évalué pour "${nc.productTitle}". Vous avez 24h pour l'accepter.`,
          data: { nonConformityId: nc.id },
          isRead: false,
          createdAt: Timestamp.now(),
        });
      }

      this.evaluateTarget.set(null);
      this.toast.success('Montant envoyé au vendeur (24h pour accepter)');
    } catch {
      this.toast.error('Erreur lors de l\'envoi');
    } finally {
      this.saving.set(false);
    }
  }

  formatDate(ts: any): string {
    if (!ts) return '—';
    try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
