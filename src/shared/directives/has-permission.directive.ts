// ─── Shared — HasPermission Directive ────────────────────────────────────────
import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';
import { Permission } from '../../core/auth/auth.models';

@Directive({ selector: '[hasPermission]', standalone: true })
export class HasPermissionDirective implements OnInit {
  @Input('hasPermission') permission!: Permission | Permission[];
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private permService = inject(PermissionService);

  ngOnInit(): void {
    const perms = Array.isArray(this.permission) ? this.permission : [this.permission];
    if (this.permService.hasAnyPermission(perms)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
