import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div class="page-header__left">
        <div class="page-header__title-row">
          <h1 class="page-header__title">{{ title }}</h1>
        </div>
        @if (subtitle) {
          <p class="page-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content></ng-content>
      </div>
    </div>
    <div class="page-header__divider"></div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-header__title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .page-header__title {
      font-size: 24px;
      font-weight: 800;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.4px;
    }
    .page-header__subtitle {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 5px 0 0;
      font-weight: 400;
    }
    .page-header__actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .page-header__divider {
      height: 1px;
      background: linear-gradient(to right, var(--color-border), transparent);
      margin-bottom: 24px;
    }
  `]
})
export class PageHeaderComponent {
  @Input() title    = '';
  @Input() subtitle = '';
}
