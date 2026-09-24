import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="bg-background font-body-md text-on-surface antialiased">
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
export class MainLayoutComponent {}
