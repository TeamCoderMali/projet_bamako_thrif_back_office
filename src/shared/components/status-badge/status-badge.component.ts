import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeStatus =
  | 'available' | 'sold' | 'inactive' | 'pending' | 'rejected' | 'reserved'
  | 'active'    | 'banned' | 'open' | 'resolved' | 'closed'
  | 'processing' | 'delivered' | 'in_transit' | 'deposited' | 'ready_pickup' | string;

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="'badge--' + colorClass">
      <span class="badge__dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .badge__dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .badge--green  { background: #dcfce7; color: #15803d; }
    .badge--blue   { background: #dbeafe; color: #1d4ed8; }
    .badge--orange { background: #ffedd5; color: #c2410c; }
    .badge--red    { background: #fee2e2; color: #dc2626; }
    .badge--gray   { background: #f3f4f6; color: #6b7280; }
    .badge--purple { background: #ede9fe; color: #7c3aed; }
    .badge--yellow { background: #fef9c3; color: #a16207; }
  `]
})
export class StatusBadgeComponent {
  @Input() status!: BadgeStatus;

  get label(): string {
    const labels: Record<BadgeStatus, string> = {
      available:   'Disponible',
      sold:        'Vendu',
      inactive:    'Masqué',
      pending:     'En attente',
      rejected:    'Rejeté',
      reserved:    'Réservé',
      active:      'Actif',
      banned:      'Banni',
      open:        'Ouvert',
      resolved:    'Résolu',
      closed:      'Fermé',
      processing:  'En traitement',
      delivered:   'Livré',
      in_transit:  'En transit',
      deposited:   'Déposé',
      ready_pickup: 'Disponible (retrait)',
    };
    return labels[this.status] ?? this.status;
  }

  get colorClass(): string {
    const colors: Record<BadgeStatus, string> = {
      available: 'green', sold: 'blue', inactive: 'gray', pending: 'yellow',
      rejected: 'red', reserved: 'purple', active: 'green', banned: 'red',
      open: 'orange', resolved: 'green', closed: 'gray', processing: 'orange',
      delivered: 'green', in_transit: 'blue', deposited: 'orange', ready_pickup: 'green',
    };
    return colors[this.status] ?? 'gray';
  }
}
