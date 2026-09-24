import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow h-full">
      <div class="flex items-start justify-between">
        <div class="flex flex-col">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{{ title }}</span>
          <span [ngClass]="valueColorClass" class="font-display-lg text-display-lg font-code-tabular mt-1">{{ value }}</span>
        </div>
        <div [ngClass]="iconBgClass" class="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
          <span [ngClass]="iconColorClass" class="material-symbols-outlined text-[22px]" [style.font-variation-settings]="iconFill ? '\\'FILL\\' 1' : ''">{{ icon }}</span>
        </div>
      </div>
      <div class="mt-4 pt-3 flex items-center justify-between text-body-sm font-body-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
        <span class="text-on-surface-variant">{{ subtitleLeft }}</span>
        @if(subtitleRight) {
          <span [ngClass]="subtitleRightColorClass" class="font-code-tabular text-label-sm font-label-sm">{{ subtitleRight }}</span>
        } @else if (subtitleRightFallback) {
          <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span class="text-on-surface-variant">{{ subtitleRightFallback }}</span>
        }
      </div>
    </div>
  `
})
export class MetricCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() valueColorClass: string = 'text-on-surface';
  
  @Input() icon: string = '';
  @Input() iconBgClass: string = 'bg-surface-container-high';
  @Input() iconColorClass: string = 'text-primary';
  @Input() iconFill: boolean = false;

  @Input() subtitleLeft: string = '';
  @Input() subtitleRight?: string = '';
  @Input() subtitleRightFallback?: string = '';
  @Input() subtitleRightColorClass: string = '';
}
