import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Firestore, collection, query, where, getDocs, addDoc, Timestamp, limit } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent }     from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent }    from '../../../shared/components/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

interface NC { id: string; productTitle: string; reason: string; description: string; status: string; createdAt: any; photoUrls?: string[]; }

interface PhotoPreview { file: File; url: string; }

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
              @if (nc.photoUrls?.length) {
                <div class="nc-photos">
                  @for (url of nc.photoUrls; track url) {
                    <img [src]="url" class="nc-photo-thumb" (click)="openPhoto(url)" />
                  }
                </div>
              }
              <span class="nc-date">{{ formatDate(nc.createdAt) }}</span>
            </div>
            <app-status-badge [status]="nc.status" />
          </div>
        }
      }
    </div>

    <!-- Form modal -->
    @if (showForm()) {
      <div class="overlay" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Signaler une non-conformité</h3>
            <button class="btn-close" (click)="closeForm()"><span class="material-icons">close</span></button>
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

            <div class="field">
              <label>Photos (preuve de la discordance) *</label>
              <input type="file" accept="image/*" multiple (change)="onPhotosSelected($event)" #fileInput />
              @if (photoPreviews().length > 0) {
                <div class="photo-preview-grid">
                  @for (p of photoPreviews(); track p.url; let i = $index) {
                    <div class="photo-preview-item">
                      <img [src]="p.url" />
                      <button type="button" class="photo-remove" (click)="removePhoto(i)">
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn--ghost" (click)="closeForm()">Annuler</button>
            <button class="btn btn--primary" (click)="submitNC()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> {{ uploadingLabel() }} } @else { Soumettre }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Photo lightbox -->
    @if (lightboxUrl()) {
      <div class="overlay overlay--dark" (click)="lightboxUrl.set(null)">
        <img [src]="lightboxUrl()" class="lightbox-img" (click)="$event.stopPropagation()" />
      </div>
    }
  `,
  styles: [`
    .nc-photos { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
    .nc-photo-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #e5e7eb; }
    .photo-preview-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .photo-preview-item { position: relative; width: 72px; height: 72px; }
    .photo-preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
    .photo-remove {
      position: absolute; top: -6px; right: -6px; background: #dc2626; color: white;
      border: none; border-radius: 50%; width: 20px; height: 20px; display: flex;
      align-items: center; justify-content: center; cursor: pointer; padding: 0;
    }
    .photo-remove .material-icons { font-size: 14px; }
    .overlay--dark { background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; }
    .lightbox-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }
  `],
  styleUrl: './non-conformities.component.scss'
})
export class NonConformitiesComponent implements OnInit {
  private fs          = inject(Firestore);
  private storage     = inject(Storage);
  private authService: AuthService = inject(AuthService);
  private toast       = inject(ToastService);
  private route        = inject(ActivatedRoute);

  ncs      = signal<NC[]>([]);
  loading  = signal(true);
  showForm = signal(false);
  saving   = signal(false);
  uploadingLabel = signal('Envoi...');
  photoPreviews = signal<PhotoPreview[]>([]);
  lightboxUrl = signal<string | null>(null);
  form     = { productTitle: '', reason: '', description: '' };

  async ngOnInit(): Promise<void> {
    // Pré-remplissage si on arrive depuis "Signaler NC" sur une commande précise
    const qp = this.route.snapshot.queryParamMap;
    const productTitle = qp.get('productTitle');
    if (productTitle) {
      this.form.productTitle = productTitle;
      this.showForm.set(true);
    }

    try {
      const uid = this.authService.currentUser()?.uid ?? '';
      const q   = query(collection(this.fs, 'non_conformities'), where('relayManagerId', '==', uid), limit(100));
      const s   = await getDocs(q);
      this.ncs.set(s.docs.map(d => ({ id: d.id, ...d.data() } as NC)));
    } catch {} finally { this.loading.set(false); }
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    const previews = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    this.photoPreviews.update(list => [...list, ...previews]);
    input.value = '';
  }

  removePhoto(index: number): void {
    this.photoPreviews.update(list => {
      URL.revokeObjectURL(list[index].url);
      return list.filter((_, i) => i !== index);
    });
  }

  openPhoto(url: string): void { this.lightboxUrl.set(url); }

  closeForm(): void {
    this.photoPreviews().forEach(p => URL.revokeObjectURL(p.url));
    this.photoPreviews.set([]);
    this.form = { productTitle: '', reason: '', description: '' };
    this.showForm.set(false);
  }

  async submitNC(): Promise<void> {
    if (!this.form.productTitle || !this.form.reason) { this.toast.warning('Titre et motif obligatoires'); return; }
    if (this.photoPreviews().length === 0) { this.toast.warning('Au moins une photo est requise pour documenter la non-conformité'); return; }

    this.saving.set(true);
    try {
      const uid = this.authService.currentUser()?.uid ?? '';

      // 1. Upload des photos vers Firebase Storage
      const photoUrls: string[] = [];
      const previews = this.photoPreviews();
      for (let i = 0; i < previews.length; i++) {
        this.uploadingLabel.set(`Envoi photo ${i + 1}/${previews.length}...`);
        const file = previews[i].file;
        const path = `non_conformities/${uid}/${Date.now()}_${i}_${file.name}`;
        const storageRef = ref(this.storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }

      // 2. Création du document Firestore avec les URLs des photos
      const ref2 = await addDoc(collection(this.fs, 'non_conformities'), {
        ...this.form, relayManagerId: uid, status: 'open', photoUrls, createdAt: Timestamp.now(),
      });
      this.ncs.update(list => [{ id: ref2.id, ...this.form, status: 'open', photoUrls, createdAt: Timestamp.now() }, ...list]);
      this.closeForm();
      this.toast.success('Non-conformité signalée avec photos');
    } catch (err: any) {
      console.error('[NonConformities] submitNC error:', err?.message);
      this.toast.error('Erreur lors de l\'envoi');
    } finally {
      this.saving.set(false);
    }
  }

  formatDate(ts: any): string {
    if (!ts) return '—'; try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('fr-FR'); } catch { return '—'; }
  }
}
