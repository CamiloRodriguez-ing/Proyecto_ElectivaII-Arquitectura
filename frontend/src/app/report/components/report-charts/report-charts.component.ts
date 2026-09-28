import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
      
      <!-- Pie Chart -->
      <div class="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between relative min-h-[350px]">
        <div *ngIf="isLoading" class="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
           <span class="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
        
        <div class="flex items-center justify-between pb-4">
          <div>
            <h2 class="font-headline-md text-headline-md text-on-surface">Distribución de solicitudes por estado</h2>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Balance global de las {{ total }} instancias registradas</p>
          </div>
          <span class="material-symbols-outlined text-outline text-[20px]">pie_chart</span>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
          <div class="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
            <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              <circle cx="80" cy="80" fill="transparent" r="60" stroke="#E2E8F0" stroke-width="20"></circle>
              
              <!-- Aprobadas -->
              <circle *ngIf="approvedLength() > 0" class="transition-all duration-700 hover:opacity-90" cx="80" cy="80" fill="transparent" r="60" stroke="#15803D" [attr.stroke-dasharray]="approvedLength() + ' 377'" [attr.stroke-dashoffset]="0" stroke-width="20"></circle>
              
              <!-- Requiere ajustes -->
              <circle *ngIf="changesLength() > 0" class="transition-all duration-700 hover:opacity-90" cx="80" cy="80" fill="transparent" r="60" stroke="#D97706" [attr.stroke-dasharray]="changesLength() + ' 377'" [attr.stroke-dashoffset]="-approvedLength()" stroke-width="20"></circle>
              
              <!-- En revisión -->
              <circle *ngIf="reviewLength() > 0" class="transition-all duration-700 hover:opacity-90" cx="80" cy="80" fill="transparent" r="60" stroke="#4F46E5" [attr.stroke-dasharray]="reviewLength() + ' 377'" [attr.stroke-dashoffset]="-(approvedLength() + changesLength())" stroke-width="20"></circle>
              
              <!-- Rechazadas -->
              <circle *ngIf="rejectedLength() > 0" class="transition-all duration-700 hover:opacity-90" cx="80" cy="80" fill="transparent" r="60" stroke="#DC2626" [attr.stroke-dasharray]="rejectedLength() + ' 377'" [attr.stroke-dashoffset]="-(approvedLength() + changesLength() + reviewLength())" stroke-width="20"></circle>
              
              <!-- Enviadas -->
              <circle *ngIf="submittedLength() > 0" class="transition-all duration-700 hover:opacity-90" cx="80" cy="80" fill="transparent" r="60" stroke="#2563EB" [attr.stroke-dasharray]="submittedLength() + ' 377'" [attr.stroke-dashoffset]="-(approvedLength() + changesLength() + reviewLength() + rejectedLength())" stroke-width="20"></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span class="font-headline-lg text-headline-lg text-on-surface font-code-tabular">{{ total }}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">solicitudes</span>
            </div>
          </div>
          
          <div class="flex flex-col gap-2 w-full max-w-xs">
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#15803D]"></span>
                <span class="font-label-md text-label-md text-on-surface">Aprobadas</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-label-md font-label-md text-on-surface">{{ byStatus['APPROVED'] || 0 }}</span>
                <span class="font-code-tabular text-body-sm text-body-sm text-on-surface-variant">({{ pct(byStatus['APPROVED'] || 0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#D97706]"></span>
                <span class="font-label-md text-label-md text-on-surface">Requiere ajustes</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-label-md font-label-md text-on-surface">{{ byStatus['CHANGES_REQUESTED'] || 0 }}</span>
                <span class="font-code-tabular text-body-sm text-body-sm text-on-surface-variant">({{ pct(byStatus['CHANGES_REQUESTED'] || 0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#4F46E5]"></span>
                <span class="font-label-md text-label-md text-on-surface">En revisión</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-label-md font-label-md text-on-surface">{{ byStatus['UNDER_REVIEW'] || 0 }}</span>
                <span class="font-code-tabular text-body-sm text-body-sm text-on-surface-variant">({{ pct(byStatus['UNDER_REVIEW'] || 0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#DC2626]"></span>
                <span class="font-label-md text-label-md text-on-surface">Rechazadas</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-label-md font-label-md text-on-surface">{{ byStatus['REJECTED'] || 0 }}</span>
                <span class="font-code-tabular text-body-sm text-body-sm text-on-surface-variant">({{ pct(byStatus['REJECTED'] || 0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-[#2563EB]"></span>
                <span class="font-label-md text-label-md text-on-surface">Enviadas</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-code-tabular text-label-md font-label-md text-on-surface">{{ byStatus['SUBMITTED'] || 0 }}</span>
                <span class="font-code-tabular text-body-sm text-body-sm text-on-surface-variant">({{ pct(byStatus['SUBMITTED'] || 0) }}%)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="text-right pt-2">
          <span class="font-body-sm text-body-sm text-on-surface-variant">Cálculo dinámico basado en las cargas de la sesión activa</span>
        </div>
      </div>
      
      <!-- Bar Chart -->
      <div class="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between min-h-[350px] relative">
        <div *ngIf="isLoading" class="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
           <span class="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
        
        <div class="flex items-center justify-between pb-4">
          <div>
            <h2 class="font-headline-md text-headline-md text-on-surface">Solicitudes por tipo de trámite</h2>
            <p class="font-body-sm text-body-sm text-on-surface-variant">Categorización reglamentaria en vigor</p>
          </div>
          <span class="material-symbols-outlined text-outline text-[20px]">bar_chart</span>
        </div>
        
        <div class="flex flex-col gap-5 my-auto py-2">
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-body-md font-body-md">
              <span class="font-label-lg text-label-lg text-on-surface">Homologación de asignatura (CREDIT_TRANSFER)</span>
              <span class="font-code-tabular text-primary font-headline-sm">{{ byType['CREDIT_TRANSFER'] || 0 }} trámites (100%)</span>
            </div>
            <div class="w-full bg-surface-container h-3.5 rounded-full overflow-hidden flex">
              <div class="bg-primary h-full rounded-full transition-all duration-500 w-full"></div>
            </div>
          </div>
          
          <div class="p-4 bg-surface-container-low rounded-xl flex flex-col gap-2">
            <div class="flex items-center gap-2 text-on-surface font-headline-sm text-headline-sm">
              <span class="material-symbols-outlined text-tertiary text-[20px]">rule_folder</span>
              <span>Próximas líneas de trámites habilitadas</span>
            </div>
            <p class="font-body-sm text-body-sm text-on-surface-variant">
              Las modalidades de <strong class="text-on-surface">Validación por suficiencia académica</strong> y <strong class="text-on-surface">Homologación por convenio bilateral internacional</strong> se activarán para el período ordinario de matrícula. En la sesión actual no se han recibido expedientes bajo dichas claves.
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                <span class="material-symbols-outlined text-[14px]">lock_clock</span> K-SUFFICIENCY (Próx. Noviembre)
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                <span class="material-symbols-outlined text-[14px]">public</span> BILATERAL_AGREEMENT (Próx. Noviembre)
              </span>
            </div>
          </div>
        </div>
        
        <div class="pt-2 text-right">
          <span class="font-body-sm text-body-sm text-on-surface-variant">Filtro aplicado: Todos los programas de grado</span>
        </div>
      </div>
    </div>
  `
})
export class ReportChartsComponent {
  @Input() isLoading = false;
  @Input() total = 0;
  @Input() byStatus: Record<string, number> = {};
  @Input() byType: Record<string, number> = {};

  pct(val: number): string {
    if (this.total === 0) return '0';
    return ((val / this.total) * 100).toFixed(0);
  }

  // 377 is the circumference of the circle
  calcLen(val: number): number {
    if (this.total === 0) return 0;
    return (val / this.total) * 377;
  }

  approvedLength() { return this.calcLen(this.byStatus['APPROVED'] || 0); }
  changesLength() { return this.calcLen(this.byStatus['CHANGES_REQUESTED'] || 0); }
  reviewLength() { return this.calcLen(this.byStatus['UNDER_REVIEW'] || 0); }
  rejectedLength() { return this.calcLen(this.byStatus['REJECTED'] || 0); }
  submittedLength() { return this.calcLen(this.byStatus['SUBMITTED'] || 0); }
}
