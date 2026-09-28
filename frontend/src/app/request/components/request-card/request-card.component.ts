import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AcademicRequestResponseData } from '../../services/request.types';

@Component({
  selector: 'app-request-card',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  template: `
    <div class="flex flex-col justify-between bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all h-full">
      <div class="flex flex-col gap-space-md">
        
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-code-tabular text-code-tabular text-primary font-bold tracking-wide">SOL · {{ request.request_id | slice:0:8 | uppercase }}</span>
              <span class="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">Homologación de asignatura</span>
            </div>
            <span class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">{{ getStatusIcon(request.status) }}</span> 
              {{ request.created_at | date:'dd MMM yyyy, hh:mm a' }}
            </span>
          </div>
          
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-md font-label-md shadow-xs" [ngClass]="getStatusClasses(request.status)">
            <span *ngIf="request.status === 'UNDER_REVIEW'" class="h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
            <span *ngIf="request.status !== 'UNDER_REVIEW'" class="material-symbols-outlined text-[16px]">{{ getStatusIcon(request.status) }}</span> 
            {{ getStatusLabel(request.status) }}
          </span>
        </div>

        <div class="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex flex-col min-w-0">
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase truncate">Origen ({{ request.student.name }})</span>
              <span class="font-headline-sm text-headline-sm text-on-surface truncate" [title]="request.academic_data.source_course">{{ request.academic_data.source_course }}</span>
              <span class="font-code-tabular text-code-tabular text-outline">{{ request.academic_data.source_credits }} Créditos</span>
            </div>
            <div class="flex items-center justify-center h-8 w-8 rounded-full bg-surface-container text-primary self-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </div>
            <div class="flex flex-col sm:text-right min-w-0">
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase truncate">Destino Propuesto</span>
              <span class="font-headline-sm text-headline-sm text-on-surface truncate" [title]="request.academic_data.target_course">{{ request.academic_data.target_course }}</span>
              <span class="font-code-tabular text-code-tabular text-outline">{{ request.academic_data.target_credits }} Créditos</span>
            </div>
          </div>
        </div>

        <!-- Render if documents exist -->
        <div *ngIf="request.documents && request.documents.length > 0" class="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest">
          <div class="flex items-center gap-2 min-w-0">
            <div class="h-9 w-9 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-label-md text-label-md text-on-surface truncate">{{ request.documents[0].name }}</span>
              <span class="font-code-tabular text-code-tabular text-on-surface-variant">{{ (request.documents[0].size_bytes / 1024 / 1024).toFixed(1) }} MB</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-label-sm font-label-sm bg-secondary-container text-on-secondary-container whitespace-nowrap">Hash OK</span>
        </div>
        
        <!-- Observaciones o Errores -->
        <div *ngIf="request.status === 'CHANGES_REQUESTED' && request.observations?.length" class="p-3 rounded-xl bg-error-container/40 flex items-start gap-2.5 mt-2">
          <span class="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">announcement</span>
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-error font-bold">Observación:</span>
            <p class="font-body-sm text-body-sm text-on-surface">"{{ request.observations[0] }}"</p>
          </div>
        </div>
      </div>
      
      <div class="mt-space-md pt-3 flex items-center justify-between border-t border-surface-container">
        <button 
          (click)="viewDetails.emit(request)"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          [ngClass]="getButtonClasses(request.status)" 
          type="button">
          <span class="material-symbols-outlined text-[18px]">{{ getButtonIcon(request.status) }}</span>
          <span>{{ getButtonLabel(request.status) }}</span>
        </button>
        <button *ngIf="request.status !== 'CHANGES_REQUESTED'" class="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors" type="button">
          <span class="material-symbols-outlined text-[20px]">more_vert</span>
        </button>
        <span *ngIf="request.status === 'CHANGES_REQUESTED'" class="font-label-sm text-label-sm text-error">Vence pronto</span>
      </div>
    </div>
  `
})
export class RequestCardComponent {
  @Input({ required: true }) request!: AcademicRequestResponseData;
  @Output() viewDetails = new EventEmitter<AcademicRequestResponseData>();

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'SUBMITTED': 'Enviada',
      'UNDER_REVIEW': 'En revisión',
      'APPROVED': 'Aprobada',
      'CHANGES_REQUESTED': 'Requiere ajustes',
      'REJECTED': 'Rechazada'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'SUBMITTED': 'send',
      'UNDER_REVIEW': 'schedule',
      'APPROVED': 'verified',
      'CHANGES_REQUESTED': 'warning',
      'REJECTED': 'cancel'
    };
    return icons[status] || 'info';
  }

  getStatusClasses(status: string): string {
    const classes: Record<string, string> = {
      'SUBMITTED': 'bg-primary-fixed text-on-primary-fixed',
      'UNDER_REVIEW': 'bg-tertiary-fixed text-on-tertiary-fixed',
      'APPROVED': 'bg-secondary-fixed text-on-secondary-fixed',
      'CHANGES_REQUESTED': 'bg-error-container text-on-error-container',
      'REJECTED': 'bg-error text-on-error'
    };
    return classes[status] || 'bg-surface-variant text-on-surface-variant';
  }

  getButtonClasses(status: string): string {
    if (status === 'CHANGES_REQUESTED') {
      return 'bg-primary text-on-primary hover:bg-primary-container shadow-sm';
    }
    return 'bg-surface-container hover:bg-surface-variant text-on-surface font-label-md text-label-md';
  }

  getButtonLabel(status: string): string {
    if (status === 'CHANGES_REQUESTED') return 'Corregir y anexar';
    if (status === 'APPROVED') return 'Ver resolución';
    if (status === 'SUBMITTED') return 'Ver estado';
    return 'Ver resumen';
  }

  getButtonIcon(status: string): string {
    if (status === 'CHANGES_REQUESTED') return 'edit_document';
    return 'visibility';
  }
}
