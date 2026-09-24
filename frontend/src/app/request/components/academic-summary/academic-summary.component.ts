import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestAcademicData } from '../../services/request.types';

@Component({
  selector: 'app-academic-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <div class="flex items-center justify-between pb-space-md mb-space-md bg-surface-container-low -mx-space-lg -mt-space-lg px-space-lg pt-space-md rounded-t-xl">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[22px]">compare_arrows</span>
          <h2 class="font-headline-md text-headline-md text-on-surface">2. Información académica y convalidación</h2>
        </div>
        <span class="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-md font-semibold">Tipo: Homologación de asignatura</span>
      </div>
      <p class="font-body-md text-body-md text-on-surface-variant mb-space-md">
        Se solicita el reconocimiento de equivalencia de la asignatura cursada y aprobada con base en la afinidad de contenidos analíticos y correspondencia de créditos según el Acuerdo Académico 042.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-11 gap-space-sm items-stretch">
        <!-- Asignatura de Origen -->
        <div class="md:col-span-5 bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-label-sm bg-surface-variant text-on-tertiary-fixed-variant px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Asignatura de Origen</span>
              <span class="font-code-tabular text-code-tabular text-primary font-semibold">CALC-101</span>
            </div>
            <h3 class="font-headline-lg text-headline-lg text-on-surface mb-1">{{ academicData.source_course }}</h3>
            <p class="font-body-sm text-body-sm text-on-surface-variant mb-3">Universidad de Procedencia (Sede Central)</p>
            <div class="flex flex-wrap gap-2 text-label-sm font-label-sm">
              <span class="px-2 py-1 bg-surface-container-lowest rounded text-on-surface font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px] text-secondary">award_star</span> {{ academicData.source_credits }} Créditos
              </span>
              <span class="px-2 py-1 bg-surface-container-lowest rounded text-on-surface font-semibold">Calificación: 4.3 / 5.0</span>
            </div>
          </div>
        </div>
        
        <!-- Conector -->
        <div class="md:col-span-1 flex md:flex-col items-center justify-center gap-2 py-2">
          <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="font-label-sm text-label-sm text-secondary font-bold">92%</span>
            <span class="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">Afinidad</span>
          </div>
        </div>
        
        <!-- Asignatura Destino -->
        <div class="md:col-span-5 bg-surface-container-high p-space-md rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-label-sm text-label-sm bg-primary text-on-primary px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Plan de Estudios Actual</span>
              <span class="font-code-tabular text-code-tabular text-primary font-semibold">MAT-2101</span>
            </div>
            <h3 class="font-headline-lg text-headline-lg text-on-surface mb-1">{{ academicData.target_course }}</h3>
            <p class="font-body-sm text-body-sm text-on-surface-variant mb-3">Facultad de Ingeniería · Semestre I</p>
            <div class="flex flex-wrap gap-2 text-label-sm font-label-sm">
              <span class="px-2 py-1 bg-surface-container-lowest rounded text-on-surface font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px] text-primary">school</span> {{ academicData.target_credits }} Créditos
              </span>
              <span class="px-2 py-1 bg-surface-container-lowest rounded text-secondary font-semibold">Equivalencia 1:1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AcademicSummaryComponent {
  @Input({ required: true }) academicData!: RequestAcademicData;
}
