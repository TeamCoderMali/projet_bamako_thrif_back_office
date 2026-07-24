import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card">
      <div class="stat-card__top">
        <div class="stat-card__icon" [style.background]="iconBg">
          <span class="material-icons">{{ icon }}</span>
        </div>
        @if (trend !== null) {
          <span class="stat-card__trend" [class.up]="trend! >= 0" [class.down]="trend! < 0">
            <span class="material-icons">{{ trend! >= 0 ? 'trending_up' : 'trending_down' }}</span>
            {{ trend! >= 0 ? '+' : '' }}{{ trend }}%
          </span>
        }
      </div>
      <p class="stat-card__value">{{ value }}</p>
      <p class="stat-card__label">{{ label }}</p>
      <div class="stat-card__bar" [style.background]="iconBg + '22'">
        <div class="stat-card__bar-fill" [style.background]="iconBg"></div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
      cursor: default;
      transition: box-shadow 0.25s ease, transform 0.2s ease;
      box-shadow: var(--shadow-sm);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 80px; height: 80px;
      background: radial-gradient(circle at top right, var(--glow, rgba(107,127,77,0.08)), transparent 70%);
      pointer-events: none;
    }
    .stat-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
    .stat-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .stat-card__icon {
      width: 42px; height: 42px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }
    .stat-card__icon .material-icons {
      font-size: 20px !important;
      color: #fff;
    }
    .stat-card__value {
      font-size: 28px;
      font-weight: 800;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .stat-card__label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
    }
    .stat-card__bar {
      height: 3px;
      border-radius: 2px;
      margin-top: 6px;
      overflow: hidden;
    }
    .stat-card__bar-fill {
      height: 100%;
      width: 60%;
      border-radius: 2px;
      opacity: 0.7;
    }
    .stat-card__trend {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 20px;
    }
    .stat-card__trend .material-icons { font-size: 13px !important; }
    .up   { background: #dcfce7; color: #15803d; }
    .down { background: #fee2e2; color: #dc2626; }
  `]
})
export class StatCardComponent {
  @Input() label  = '';
  @Input() value  = '';
  @Input() icon   = 'analytics';
  @Input() iconBg = '#6B7F4D';
  @Input() trend: number | null = null;
}
