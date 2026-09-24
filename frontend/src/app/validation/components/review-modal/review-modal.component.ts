import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecisionType } from '../review-form/review-form.component';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tertiary/45 backdrop-blur-[2px]">
      <div class="rounded-xl bg-surface-container-lowest max-w-lg w-full p-space-lg shadow-xl flex flex-col gap-5 transform transition-all">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" [ngClass]="getIconContainerClasses()">
              <span class="material-symbols-outlined text-[24px]">{{ getIcon() }}</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface">Confirmar decisión colegiada</h3>
              <p class="font-code-tabular text-code-tabular text-on-surface-variant">Trámite SOL · {{ requestId | slice:0:8 | uppercase }}</p>
            </div>
          </div>
          <button (click)="cancel.emit()" class="text-on-surface-variant hover:text-on-surface p-1 rounded-md" type="button">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <div class="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3 font-body-md text-body-md">
          <div class="flex items-center justify-between font-label-md text-label-md">
            <span class="text-on-surface-variant">Transición de estado:</span>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-surface-container text-primary text-[12px] uppercase">En revisión</span>
              <span class="material-symbols-outlined text-[14px] text-outline">arrow_forward</span>
              <span class="px-2 py-0.5 rounded text-[12px] font-bold uppercase" [ngClass]="getBadgeClasses()">
                {{ getBadgeText() }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-1 text-on-surface">
            <span class="font-label-sm text-label-sm text-outline">Observación registrada:</span>
            <blockquote class="p-2.5 rounded bg-surface-container-lowest italic text-on-surface text-body-sm">
              "{{ observation }}"
            </blockquote>
          </div>
          <div class="flex items-start gap-2 text-outline text-body-sm pt-1">
            <span class="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
            <span>Al confirmar, el expediente pasará irreversiblemente a <strong>Versión {{ currentVersion + 1 }}</strong>, se notificará al estudiante y se generará un evento de auditoría en <code class="font-code-tabular text-primary">/notifications</code>.</span>
          </div>
        </div>
        
        <div class="flex items-center justify-end gap-3 pt-2">
          <button (click)="cancel.emit()" [disabled]="isSubmitting" class="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors disabled:opacity-50" type="button">
            Revisar nuevamente
          </button>
          <button (click)="confirm.emit()" [disabled]="isSubmitting" [ngClass]="getButtonClasses()" class="px-4 py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" type="button">
            <span *ngIf="!isSubmitting" class="material-symbols-outlined text-[18px]">check</span>
            <span *ngIf="isSubmitting" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span>Registrar y Notificar</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ReviewModalComponent {
  @Input({ required: true }) decision!: DecisionType;
  @Input({ required: true }) observation!: string;
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) currentVersion!: number;
  @Input() isSubmitting = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  getIconContainerClasses(): string {
    if (this.decision === 'APPROVE') return 'bg-secondary-container text-secondary';
    if (this.decision === 'REQUEST_CHANGES') return 'bg-surface-container-high text-tertiary';
    return 'bg-error-container text-error';
  }

  getIcon(): string {
    if (this.decision === 'APPROVE') return 'verified';
    if (this.decision === 'REQUEST_CHANGES') return 'edit_note';
    return 'block';
  }

  getBadgeClasses(): string {
    if (this.decision === 'APPROVE') return 'bg-secondary-container text-secondary';
    if (this.decision === 'REQUEST_CHANGES') return 'bg-surface-container-high text-tertiary';
    return 'bg-error-container text-error';
  }

  getBadgeText(): string {
    if (this.decision === 'APPROVE') return 'Aprobada';
    if (this.decision === 'REQUEST_CHANGES') return 'Requiere ajustes';
    return 'Rechazada';
  }

  getButtonClasses(): string {
    if (this.decision === 'APPROVE') return 'bg-secondary hover:bg-secondary/90 text-on-secondary';
    if (this.decision === 'REQUEST_CHANGES') return 'bg-tertiary hover:bg-tertiary/90 text-on-tertiary';
    return 'bg-error hover:bg-error/90 text-on-error';
  }
}
