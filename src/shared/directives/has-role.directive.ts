// ─── Shared — HasRole Directive ───────────────────────────────────────────────
import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { RoleService } from '../../core/services/role.service';
import { UserRole } from '../../core/auth/auth.models';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective implements OnInit {
  @Input('hasRole') role!: UserRole | UserRole[];
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private roleService = inject(RoleService);

  ngOnInit(): void {
    if (this.roleService.hasRole(this.role)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
