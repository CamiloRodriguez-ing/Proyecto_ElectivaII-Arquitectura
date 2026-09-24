import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-validation-checklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-2.5 mb-space-lg">
      <div class="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
        <span>Matriz de verificación</span>
        <span class="text-secondary font-bold font-code-tabular">4 / 4 Completas</span>
      </div>
      <div class="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface">
        <span class="material-symbols-outlined text-secondary text-[18px] shrink-0" style="font-variation-settings: 'FILL' 1;">check_box</span>
        <span>Datos personales completos y validados con Registro Académico.</span>
      </div>
      <div class="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface">
        <span class="material-symbols-outlined text-secondary text-[18px] shrink-0" style="font-variation-settings: 'FILL' 1;">check_box</span>
        <span>Correo universitario con dominio verificado <code>@universidad.edu.co</code>.</span>
      </div>
      <div class="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface">
        <span class="material-symbols-outlined text-secondary text-[18px] shrink-0" style="font-variation-settings: 'FILL' 1;">check_box</span>
        <span>Información de asignaturas y créditos equivalente.</span>
      </div>
      <div class="flex items-start gap-2.5 p-2 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface">
        <span class="material-symbols-outlined text-secondary text-[18px] shrink-0" style="font-variation-settings: 'FILL' 1;">check_box</span>
        <span>Documento PDF dentro del límite permitido.</span>
      </div>
    </div>

    <!-- Declaración Jurada Obligatoria -->
    <label class="flex items-start gap-3 p-3 rounded-xl bg-surface-container cursor-pointer select-none mb-space-lg">
      <input 
        [checked]="consent" 
        (change)="onConsentChange($event)" 
        class="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" 
        type="checkbox"/>
      <span class="font-body-sm text-body-sm text-on-surface">
        Confirmo que la información suministrada es correcta y verídica con base en los planes vigentes.
      </span>
    </label>
  `
})
export class ValidationChecklistComponent {
  @Input() consent = false;
  @Output() consentChange = new EventEmitter<boolean>();

  onConsentChange(event: Event) {
    this.consentChange.emit((event.target as HTMLInputElement).checked);
  }
}
