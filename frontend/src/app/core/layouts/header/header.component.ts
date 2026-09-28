import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="fixed top-0 left-[260px] right-0 z-40 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="h-16 px-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <nav class="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span class="hover:text-on-surface cursor-pointer">Portal Universitario</span>
          </nav>
        </div>
        <div class="flex items-center gap-4">
          <button (click)="logout()" class="px-4 py-1.5 rounded-lg bg-error text-on-error font-label-md hover:bg-error/90 transition-colors" type="button">
            Cerrar sesión
          </button>
          <div class="flex items-center gap-3 pl-3">
            <div class="flex flex-col text-right hidden sm:flex">
              <span class="font-label-md text-label-md text-on-surface">{{ authService.currentUser()?.description || 'Usuario' }}</span>
              <span class="font-label-sm text-label-sm text-primary">{{ authService.currentUser()?.name || 'Rol' }}</span>
            </div>
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  public authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
