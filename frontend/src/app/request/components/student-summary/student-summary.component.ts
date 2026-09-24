import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestStudent } from '../../services/request.types';

@Component({
  selector: 'app-student-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <div class="flex items-center justify-between pb-space-md mb-space-md bg-surface-container-low -mx-space-lg -mt-space-lg px-space-lg pt-space-md rounded-t-xl">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[22px]">badge</span>
          <h2 class="font-headline-md text-headline-md text-on-surface">1. Datos del estudiante solicitante</h2>
        </div>
        <span class="font-label-sm text-label-sm px-2.5 py-1 bg-secondary-container text-on-secondary-container rounded-md font-semibold">Validado por SAC</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-container-low">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Código Estudiantil</span>
          <span class="font-headline-sm text-headline-sm text-on-surface font-code-tabular">{{ student.student_code }}</span>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-container-low">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Nombres y Apellidos</span>
          <span class="font-headline-sm text-headline-sm text-on-surface">{{ student.name }}</span>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-container-low">
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Correo Institucional</span>
          <span class="font-headline-sm text-headline-sm text-on-surface truncate" [title]="student.email">{{ student.email }}</span>
        </div>
      </div>
      <div class="mt-space-md flex items-center gap-2 text-secondary font-label-md text-label-md bg-surface-container px-3 py-2 rounded-lg">
        <span class="material-symbols-outlined text-[18px]">verified</span>
        <span>Correo institucional .edu.co verificado mediante SSO universitario.</span>
      </div>
    </div>
  `
})
export class StudentSummaryComponent {
  @Input({ required: true }) student!: RequestStudent;
}
