import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div [ngClass]="getTenantThemeClass()" class="bg-background font-body-md text-on-surface antialiased transition-colors duration-300">
      <app-sidebar></app-sidebar>
      <div class="pl-[260px]">
        <app-header></app-header>
        <main class="w-full pt-24 bg-surface min-h-screen">
          <div class="max-w-[1440px] mx-auto p-space-lg">
            <ng-content></ng-content>
          </div>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  private authService = inject(AuthService);

  getTenantThemeClass(): string {
    const email = this.authService.currentUser()?.email?.toLowerCase() || '';
    if (email.includes('minas')) return 'theme-minas';
    if (email.includes('electronica')) return 'theme-electronica';
    return 'theme-sistemas';
  }
}
