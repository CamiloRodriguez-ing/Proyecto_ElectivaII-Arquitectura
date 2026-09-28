import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationItem } from '../../services/notification.types';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-space-md">
      <!-- Search & Filters -->
      <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[20px]">search</span>
          <input 
            class="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all" 
            placeholder="Buscar por radicado o email..." 
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"/>
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          <button 
            class="filter-chip px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors" 
            [class.bg-primary]="filter() === 'ALL'"
            [class.text-on-primary]="filter() === 'ALL'"
            [class.bg-surface-container-low]="filter() !== 'ALL'"
            [class.text-on-surface-variant]="filter() !== 'ALL'"
            [class.hover:bg-surface-container]="filter() !== 'ALL'"
            (click)="filter.set('ALL')">
            Todos ({{ notifications.length }})
          </button>
          <button 
            class="filter-chip px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors" 
            [class.bg-primary]="filter() === 'APPROVED'"
            [class.text-on-primary]="filter() === 'APPROVED'"
            [class.bg-surface-container-low]="filter() !== 'APPROVED'"
            [class.text-on-surface-variant]="filter() !== 'APPROVED'"
            [class.hover:bg-surface-container]="filter() !== 'APPROVED'"
            (click)="filter.set('APPROVED')">
            Aprobada
          </button>
          <button 
            class="filter-chip px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors"
            [class.bg-primary]="filter() === 'CHANGES_REQUESTED'"
            [class.text-on-primary]="filter() === 'CHANGES_REQUESTED'"
            [class.bg-surface-container-low]="filter() !== 'CHANGES_REQUESTED'"
            [class.text-on-surface-variant]="filter() !== 'CHANGES_REQUESTED'"
            [class.hover:bg-surface-container]="filter() !== 'CHANGES_REQUESTED'"
            (click)="filter.set('CHANGES_REQUESTED')">
            Requiere ajustes
          </button>
          <button 
            class="filter-chip px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors"
            [class.bg-primary]="filter() === 'REJECTED'"
            [class.text-on-primary]="filter() === 'REJECTED'"
            [class.bg-surface-container-low]="filter() !== 'REJECTED'"
            [class.text-on-surface-variant]="filter() !== 'REJECTED'"
            [class.hover:bg-surface-container]="filter() !== 'REJECTED'"
            (click)="filter.set('REJECTED')">
            Rechazada
          </button>
        </div>
      </div>
      
      <!-- List Header -->
      <div class="flex items-center justify-between px-2 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
        <span>Sesión actual ({{ filteredList().length }} notificaciones)</span>
        <span class="font-code-tabular text-code-tabular">SYNC LIVE</span>
      </div>
      
      <!-- Event Items Container -->
      <div class="flex flex-col gap-2.5">
        <ng-container *ngIf="isLoading">
           <div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm h-24 animate-pulse" *ngFor="let i of [1,2,3]"></div>
        </ng-container>

        <ng-container *ngIf="!isLoading">
          <div *ngFor="let notif of filteredList()" 
               class="event-card cursor-pointer p-space-md rounded-xl shadow-sm transition-all relative overflow-hidden group hover:bg-surface-container-low"
               [ngClass]="notif.id === selectedId ? 'bg-primary/[0.03] hover:bg-primary/[0.03]' : 'bg-surface-container-lowest'"
               (click)="onSelect(notif)">
            
            <div *ngIf="notif.id === selectedId" class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            
            <!-- Unread Indicator (dot) -->
            <div *ngIf="!notif.isRead" class="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-error"></div>

            <div class="flex items-start justify-between gap-2 mb-1.5" [class.pl-1]="notif.id === selectedId">
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-code-tabular font-bold" [ngClass]="notif.isRead ? 'text-on-surface-variant' : 'text-on-surface'">
                  {{ notif.request_id }}
                </span>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold"
                    [ngClass]="getStatusBadgeClasses(notif.status)">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getStatusIconColor(notif.status)"></span>
                {{ getStatusText(notif.status) }}
              </span>
            </div>
            <div class="flex flex-col gap-1" [class.pl-1]="notif.id === selectedId">
              <span class="font-body-md text-body-md truncate" [ngClass]="notif.isRead ? 'text-on-surface-variant' : 'text-on-surface font-medium'">
                {{ notif.recipient_email }}
              </span>
              <div class="flex items-center justify-between mt-1 text-on-surface-variant font-body-sm text-body-sm">
                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px]">schedule</span>
                  <span>{{ notif.date.split(',')[0] }}</span>
                </div>
                <span class="font-code-tabular text-code-tabular text-[11px] text-outline truncate max-w-[120px]">
                   {{ getStatusSubtitle(notif.status) }}
                </span>
              </div>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Quick Session Stats Panel -->
      <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between mt-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[22px]">mark_email_read</span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-label-md text-on-surface">Disparador de notificaciones</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">Modo simulado activo</span>
          </div>
        </div>
        <span class="font-code-tabular text-code-tabular text-secondary font-semibold">ESTABLE</span>
      </div>
    </div>
  `
})
export class NotificationListComponent {
  @Input() isLoading = false;
  @Input() notifications: NotificationItem[] = [];
  @Input() selectedId: string | null = null;
  
  @Output() selectNotification = new EventEmitter<NotificationItem>();

  searchQuery = signal('');
  filter = signal('ALL');

  filteredList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.filter();
    
    return this.notifications.filter(n => {
      const matchStatus = st === 'ALL' || n.status === st;
      const matchQuery = q === '' || n.recipient_email.toLowerCase().includes(q) || n.request_id.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  });

  onSelect(notif: NotificationItem) {
    this.selectNotification.emit(notif);
  }

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-[#DCFCE7] text-[#15803D]';
      case 'CHANGES_REQUESTED': return 'bg-[#FFFBEB] text-[#B45309]';
      case 'REJECTED': return 'bg-[#FEE2E2] text-[#B91C1C]';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  getStatusIconColor(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-[#15803D]';
      case 'CHANGES_REQUESTED': return 'bg-[#B45309]';
      case 'REJECTED': return 'bg-[#B91C1C]';
      default: return 'bg-outline';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Aprobada';
      case 'CHANGES_REQUESTED': return 'Requiere ajustes';
      case 'REJECTED': return 'Rechazada';
      default: return status;
    }
  }

  getStatusSubtitle(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Previsualización';
      case 'CHANGES_REQUESTED': return 'Syllabus incompleto';
      case 'REJECTED': return 'Contenido diferido';
      default: return '';
    }
  }
}
