import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap" [ngStyle]="{ width: width, height: height }">
      <div class="skeleton-shimmer"></div>
    </div>
  `,
  styles: [`
    .skeleton-wrap {
      border-radius: 8px;
      overflow: hidden;
      background: var(--color-skeleton-base);
      position: relative;
    }
    .skeleton-shimmer {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        transparent 0%,
        var(--color-skeleton-shine) 50%,
        transparent 100%
      );
      animation: shimmer 1.5s infinite;
      background-size: 200% 100%;
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() width  = '100%';
  @Input() height = '16px';
}
