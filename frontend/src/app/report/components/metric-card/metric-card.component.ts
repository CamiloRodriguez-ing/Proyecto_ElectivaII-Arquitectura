import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isLoading" class="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden h-36">
      <div class="animate-pulse flex space-x-4 h-full w-full">
        <div class="flex-1 space-y-4 py-1">
          <div class="h-4 bg-surface-container rounded w-3/4"></div>
          <div class="h-8 bg-surface-container rounded w-1/2"></div>
          <div class="h-6 bg-surface-container rounded w-full mt-auto"></div>
        </div>
      </div>
    </div>
    
    <div *ngIf="!isLoading" class="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow h-full">
      <div class="flex items-start justify-between">
        <div class="flex flex-col">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{{ title }}</span>
          <span class="font-display-lg text-display-lg font-code-tabular mt-1" [ngClass]="valueColorClass">{{ value }}</span>
        </div>
        <div class="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform" 
             [ngClass]="iconBgClass + ' ' + iconTextClass">
          <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">{{ icon }}</span>
        </div>
      </div>
      <div class="mt-4 pt-3 flex items-center justify-between text-body-sm font-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
        <span class="text-on-surface-variant">{{ footerTextLeft }}</span>
        <ng-container *ngIf="footerTextRight">
          <span class="font-code-tabular text-label-sm font-label-sm" [ngClass]="footerRightColorClass || ''">{{ footerTextRight }}</span>
        </ng-container>
      </div>
    </div>
  `
})
export class MetricCardComponent {
  @Input() isLoading = false;
  @Input() title = '';
  @Input() value = '';
  @Input() valueColorClass = 'text-on-surface';
  @Input() icon = '';
  @Input() iconBgClass = 'bg-surface-container-high';
  @Input() iconTextClass = 'text-primary';
  @Input() footerTextLeft = '';
  @Input() footerTextRight = '';
  @Input() footerRightColorClass = '';
}
