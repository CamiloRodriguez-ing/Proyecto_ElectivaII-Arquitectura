import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="fixed left-0 top-0 h-full w-[260px] bg-tertiary-container text-on-tertiary z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.08)]">
      <div class="flex flex-col">
        <div class="flex items-center gap-3 px-6 py-5 bg-tertiary">
          <img alt="Logo Portal de Solicitudes Académicas" class="h-8 w-auto object-contain" [src]="getTenantLogo()"/>
          <div class="flex flex-col overflow-hidden">
            <span class="font-headline-sm text-headline-sm text-on-tertiary tracking-tight leading-snug truncate">Solicitudes</span>
            <span class="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">{{ getTenantName() }}</span>
          </div>
        </div>
        <div class="px-4 py-3">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary-fixed-dim px-3">Navegación</span>
        </div>
        <nav class="flex flex-col gap-1 px-3">
          <a *ngIf="isEstudiante" routerLink="/requests" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-primary-container text-on-primary font-label-md rounded-lg shadow-sm border-l-4 border-surface-container-lowest" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md">
            <span class="material-symbols-outlined text-[20px]">post_add</span><span>Nueva solicitud</span>
          </a>
          <a *ngIf="!isEstudiante" routerLink="/validation" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="bg-primary-container text-on-primary font-label-md rounded-lg shadow-sm border-l-4 border-surface-container-lowest" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md">
            <span class="material-symbols-outlined text-[20px]">fact_check</span><span>Revisión / Validación</span>
          </a>
        </nav>
      </div>
      <div class="p-4 bg-tertiary/60 flex flex-col gap-3">
        <div class="flex items-center justify-between px-2 py-1.5 rounded bg-tertiary text-on-tertiary text-code-tabular font-code-tabular">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-secondary-fixed"></span>
            <span class="font-label-sm text-label-sm text-on-tertiary">API OK</span>
          </div>
          <span class="font-label-sm text-label-sm text-tertiary-fixed-dim">v1.0-demo</span>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private authService = inject(AuthService);

  get isEstudiante(): boolean {
    return this.authService.currentUser()?.id === 'estudiante';
  }

  getTenantLogo(): string {
    const email = this.authService.currentUser()?.email?.toLowerCase() || '';
    if (email.includes('minas')) return 'minas.png';
    if (email.includes('electronica')) return 'electronica.png';
    return 'sistemas.png';
  }

  getTenantName(): string {
    const email = this.authService.currentUser()?.email?.toLowerCase() || '';
    if (email.includes('minas')) return 'Ing. Minas';
    if (email.includes('electronica')) return 'Ing. Electrónica';
    return 'Ing. Sistemas';
  }
}
