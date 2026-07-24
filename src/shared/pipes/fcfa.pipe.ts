// ─── Shared — FCFA Pipe ───────────────────────────────────────────────────────
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '— FCFA';
    return value.toLocaleString('fr-FR') + ' FCFA';
  }
}
