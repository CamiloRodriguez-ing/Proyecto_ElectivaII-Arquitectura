import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DecisionType = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-xl bg-surface-container-lowest p-space-lg shadow-md flex flex-col gap-5 relative">
      <div *ngIf="isResolved()" class="absolute inset-0 bg-surface-container-lowest/70 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center">
        <!-- Overlay to block form when already resolved, handled by parent -->
      </div>
      <div>
        <h3 class="font-headline-md text-headline-md text-on-surface">Emitir decisión académica</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">El dictamen es vinculante para el consejo de facultad.</p>
      </div>
      
      <fieldset class="flex flex-col gap-2.5" [disabled]="isDisabled()">
        <legend class="sr-only">Seleccionar decisión colegiada</legend>
        
        <label 
          class="decision-card relative flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all shadow-sm"
          [ngClass]="decision() === 'APPROVE' ? 'bg-secondary-container/20 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'">
          <input 
            class="mt-1 text-secondary focus:ring-0" 
            name="academic_decision" 
            type="radio" 
            value="APPROVE"
            [ngModel]="decision()"
            (ngModelChange)="onDecisionChange('APPROVE')" />
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-secondary text-[20px]">task_alt</span>
              <span class="font-label-lg text-label-lg text-on-surface">Aprobar solicitud</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Cumple con el 80%+ de equivalencia de contenidos y créditos requeridos.</p>
          </div>
        </label>
        
        <label 
          class="decision-card relative flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all shadow-sm"
          [ngClass]="decision() === 'REQUEST_CHANGES' ? 'bg-tertiary-fixed/30 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'">
          <input 
            class="mt-1 text-tertiary focus:ring-0" 
            name="academic_decision" 
            type="radio" 
            value="REQUEST_CHANGES"
            [ngModel]="decision()"
            (ngModelChange)="onDecisionChange('REQUEST_CHANGES')" />
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[#B45309] text-[20px]">rule</span>
              <span class="font-label-lg text-label-lg text-on-surface">Solicitar ajustes</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Requiere programa firmado, aclaración de intensidad o sello consular.</p>
          </div>
        </label>
        
        <label 
          class="decision-card relative flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all shadow-sm"
          [ngClass]="decision() === 'REJECT' ? 'bg-error-container/30 shadow-sm' : 'bg-surface-container-low hover:bg-surface-container'">
          <input 
            class="mt-1 text-error focus:ring-0" 
            name="academic_decision" 
            type="radio" 
            value="REJECT"
            [ngModel]="decision()"
            (ngModelChange)="onDecisionChange('REJECT')" />
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-error text-[20px]">cancel</span>
              <span class="font-label-lg text-label-lg text-on-surface">Rechazar homologación</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">Contenidos sustancialmente divergentes o intensidad horaria insuficiente.</p>
          </div>
        </label>
      </fieldset>
      
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="font-label-md text-label-md text-on-surface flex items-center gap-1" for="reviewObservation">
            Observación académica
            <span class="text-error">*</span>
          </label>
          <span class="font-code-tabular text-code-tabular text-outline">{{ observation().length }} / 500</span>
        </div>
        <textarea 
          class="w-full p-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none transition-colors resize-none disabled:opacity-75 disabled:bg-surface-container" 
          id="reviewObservation" 
          maxlength="500" 
          placeholder="Escriba los fundamentos técnicos de la decisión..." 
          rows="4"
          [disabled]="isDisabled()"
          [ngModel]="observation()"
          (ngModelChange)="observation.set($event)"></textarea>
        <span class="font-body-sm text-body-sm text-outline">Este texto será incluido íntegramente en la resolución oficial.</span>
      </div>
      
      <!-- Ficha del Evaluador -->
      <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low relative z-0">
        <div class="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md shrink-0">AR</div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-label-md text-label-md text-on-surface truncate">Prof. Andrés Ramírez</span>
            <span class="px-1.5 py-0.2 rounded bg-surface-container-high text-primary font-code-tabular text-[10px]">revisor-024</span>
          </div>
          <span class="font-body-sm text-body-sm text-on-surface-variant truncate">Depto. de Ciencias Básicas</span>
        </div>
      </div>
      
      <div class="flex flex-col gap-2 pt-1 relative z-20">
        <button 
          (click)="onSubmit()"
          [disabled]="isDisabled() || observation().length < 5"
          [ngClass]="getButtonClasses()"
          class="w-full py-2.5 px-4 rounded-lg font-label-lg text-label-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
          type="button">
          <span class="material-symbols-outlined text-[18px]">{{ getButtonIcon() }}</span>
          <span>{{ getButtonLabel() }}</span>
        </button>
        <button 
          [disabled]="isDisabled()"
          class="w-full py-2 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors text-center disabled:opacity-50" 
          type="button">
          Cancelar / Descartar
        </button>
      </div>

      <div *ngIf="isResolved()" class="p-3 rounded-lg bg-surface-container text-on-surface-variant font-body-sm text-body-sm flex items-start gap-2 relative z-20">
        <span class="material-symbols-outlined text-[18px] text-tertiary shrink-0">lock</span>
        <span>Esta solicitud no admite nuevas evaluaciones en su estado actual.</span>
      </div>
    </div>
  `
})
export class ReviewFormComponent {
  @Input() isSubmitting = false;
  @Input() isResolved = signal(false);
  
  @Output() submitDecision = new EventEmitter<{decision: DecisionType, observation: string}>();

  decision = signal<DecisionType>('APPROVE');
  observation = signal('Se verificaron los temas de límites, razones de cambio y optimización. Cumple a cabalidad con el plan de estudios institucional.');

  onDecisionChange(newDecision: DecisionType) {
    this.decision.set(newDecision);
  }

  isDisabled(): boolean {
    return this.isSubmitting || this.isResolved();
  }

  getButtonClasses(): string {
    const d = this.decision();
    if (d === 'APPROVE') return 'bg-secondary hover:bg-secondary/90 text-on-secondary';
    if (d === 'REQUEST_CHANGES') return 'bg-tertiary hover:bg-tertiary/90 text-on-tertiary';
    return 'bg-error hover:bg-error/90 text-on-error';
  }

  getButtonLabel(): string {
    const d = this.decision();
    if (d === 'APPROVE') return 'Aprobar solicitud';
    if (d === 'REQUEST_CHANGES') return 'Requerir ajustes al estudiante';
    return 'Rechazar solicitud';
  }

  getButtonIcon(): string {
    const d = this.decision();
    if (d === 'APPROVE') return 'verified';
    if (d === 'REQUEST_CHANGES') return 'rule';
    return 'cancel';
  }

  onSubmit() {
    this.submitDecision.emit({
      decision: this.decision(),
      observation: this.observation()
    });
  }
}
