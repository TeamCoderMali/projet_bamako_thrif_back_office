// ─── Shared — TimeAgo Pipe ────────────────────────────────────────────────────
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'à l\'instant';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `il y a ${diffD}j`;
    const diffM = Math.floor(diffD / 30);
    if (diffM < 12) return `il y a ${diffM} mois`;
    return `il y a ${Math.floor(diffM / 12)} an(s)`;
  }
}
