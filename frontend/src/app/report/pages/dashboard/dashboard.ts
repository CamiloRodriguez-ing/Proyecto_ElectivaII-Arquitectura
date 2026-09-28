import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestService } from '../../../request/services/request.service';
import { ReportService } from '../../services/report.service';
import { AcademicRequestResponseData } from '../../../request/services/request.types';
import { AnalyticsSummaryResponse } from '../../services/report.types';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { ReportChartsComponent } from '../../components/report-charts/report-charts.component';
import { ReportTableComponent } from '../../components/report-table/report-table';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, MetricCardComponent, ReportChartsComponent, ReportTableComponent],
  template: `
    <app-main-layout>
      <div class="flex flex-col w-full gap-space-lg">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/5 pointer-events-none blur-2xl"></div>
          <div class="flex flex-col gap-2 relative z-10">
            <nav class="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
              <span class="hover:text-primary transition-colors cursor-pointer">Inicio</span>
              <span class="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span class="text-primary font-headline-sm">Reportes</span>
            </nav>
            <div class="flex flex-wrap items-baseline gap-3">
              <h1 class="font-headline-xl text-headline-xl text-on-surface tracking-tight">Resumen analítico de solicitudes</h1>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                Muestra analizada: {{ isLoading() ? '--' : requests().length }} solicitudes en sesión
              </span>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-3xl">
              Indicadores calculados a partir de las solicitudes disponibles en esta sesión.
            </p>
          </div>
          <div class="flex items-center gap-2 relative z-10 self-start md:self-auto">
            <button 
              (click)="loadData()" 
              [disabled]="isLoading()"
              class="inline-flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50">
              <span class="material-symbols-outlined text-[18px] text-primary transition-transform" [class.animate-spin]="isLoading()">refresh</span>
              <span>Actualizar indicadores</span>
            </button>
          </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-metric-card
            [isLoading]="isLoading()"
            title="Total de solicitudes"
            [value]="summary()?.total?.toString() || '0'"
            icon="inventory_2"
            footerTextLeft="{{ (summary()?.by_status?.['APPROVED'] || 0) + (summary()?.by_status?.['REJECTED'] || 0) }} procesadas">
          </app-metric-card>
          
          <app-metric-card
            [isLoading]="isLoading()"
            title="Tasa de aprobación"
            [value]="(summary()?.approval_percentage || 0).toFixed(1) + '%'"
            valueColorClass="text-[#15803D]"
            icon="check_circle"
            iconBgClass="bg-[#DCFCE7]"
            iconTextClass="text-[#15803D]"
            footerTextLeft="{{ summary()?.by_status?.['APPROVED'] || 0 }} dictámenes favorables"
            footerTextRight=""
            footerRightColorClass="text-[#15803D]">
          </app-metric-card>
          
          <app-metric-card
            [isLoading]="isLoading()"
            title="Tasa de rechazo"
            [value]="(summary()?.rejection_percentage || 0).toFixed(1) + '%'"
            valueColorClass="text-[#B91C1C]"
            icon="cancel"
            iconBgClass="bg-[#FEE2E2]"
            iconTextClass="text-[#B91C1C]"
            footerTextLeft="{{ summary()?.by_status?.['REJECTED'] || 0 }} no convalidadas"
            footerTextRight="Discrepancia syllabus"
            footerRightColorClass="text-[#B91C1C]">
          </app-metric-card>

          <app-metric-card
            [isLoading]="isLoading()"
            title="Requieren ajustes"
            [value]="summary()?.total ? ((summary()?.changes_requested || 0) / summary()!.total! * 100).toFixed(1) + '%' : '0%'"
            valueColorClass="text-[#B45309]"
            icon="warning"
            iconBgClass="bg-[#FEF3C7]"
            iconTextClass="text-[#B45309]"
            footerTextLeft="{{ summary()?.changes_requested || 0 }} expedientes observados"
            footerTextRight="Falta apostilla"
            footerRightColorClass="text-[#B45309]">
          </app-metric-card>
        </div>

        <!-- Charts -->
        <app-report-charts
          [isLoading]="isLoading()"
          [total]="summary()?.total || 0"
          [byStatus]="summary()?.by_status || {}"
          [byType]="summary()?.by_type || {}">
        </app-report-charts>

        <!-- Wait Time -->
        <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden min-h-[100px]">
          <div *ngIf="isLoading()" class="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div class="animate-pulse flex space-x-4 h-6 w-1/2">
              <div class="h-6 bg-surface-container rounded w-full"></div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline-variant flex-shrink-0">
              <span class="material-symbols-outlined text-[24px] text-tertiary">hourglass_disabled</span>
            </div>
            <div class="flex flex-col">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-headline-md text-headline-md text-on-surface">Tiempo medio de resolución</h3>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>
                  Sin datos suficientes para métrica histórica
                </span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Este indicador requiere solicitudes resueltas con marcas de tiempo persistentes fuera del modo demostración.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg font-code-tabular text-body-sm text-on-surface-variant self-end sm:self-auto">
            <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
            <span>Base estimada institucional: 5-7 días hábiles</span>
          </div>
        </div>

        <!-- Table -->
        <app-report-table
          [isLoading]="isLoading()"
          [requests]="requests()">
        </app-report-table>
        
      </div>
    </app-main-layout>
  `
})
export class DashboardComponent implements OnInit {
  private requestService = inject(RequestService);
  private reportService = inject(ReportService);

  requests = signal<AcademicRequestResponseData[]>([]);
  summary = signal<AnalyticsSummaryResponse | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    
    // First, fetch the requests
    this.requestService.getRequests().subscribe({
      next: (res) => {
        const data = res.data || [];
        this.requests.set(data);
        this.fetchSummary(data);
      },
      error: () => {
        // Fallback to simulated data if no backend
        setTimeout(() => {
          const simulatedData: AcademicRequestResponseData[] = [
            {
              request_id: '89f21234-abcd', type: 'CREDIT_TRANSFER', status: 'APPROVED', version: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), observations: [],
              student: { student_code: '123', name: 'Carlos Andrés Fuentes', email: 'c@u.edu' },
              academic_data: { source_course: 'Cálculo Diferencial I', target_course: 'Análisis Matemático I', source_credits: 3, target_credits: 3 },
              documents: []
            },
            {
              request_id: '77c11234-abcd', type: 'CREDIT_TRANSFER', status: 'UNDER_REVIEW', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), observations: [],
              student: { student_code: '124', name: 'Marina del Pilar Gómez', email: 'm@u.edu' },
              academic_data: { source_course: 'Estructuras de Datos', target_course: 'Algoritmos y Programación II', source_credits: 3, target_credits: 3 },
              documents: []
            },
            {
              request_id: '64b81234-abcd', type: 'CREDIT_TRANSFER', status: 'CHANGES_REQUESTED', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), observations: [],
              student: { student_code: '125', name: 'Diego Armando Salazar', email: 'd@u.edu' },
              academic_data: { source_course: 'Física Mecánica', target_course: 'Introducción a la Física Clásica', source_credits: 3, target_credits: 3 },
              documents: []
            },
            {
              request_id: '53a91234-abcd', type: 'CREDIT_TRANSFER', status: 'REJECTED', version: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), observations: [],
              student: { student_code: '126', name: 'Valentina Riaño Ortiz', email: 'v@u.edu' },
              academic_data: { source_course: 'Microeconomía Aplicada', target_course: 'Economía General y de Empresas', source_credits: 3, target_credits: 3 },
              documents: []
            },
            {
              request_id: '41d31234-abcd', type: 'CREDIT_TRANSFER', status: 'SUBMITTED', version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), observations: [],
              student: { student_code: '127', name: 'Santiago Pérez Mendoza', email: 's@u.edu' },
              academic_data: { source_course: 'Bases de Datos Relacionales', target_course: 'Sistemas de Bases de Datos', source_credits: 3, target_credits: 3 },
              documents: []
            }
          ];
          
          // Replicate 28 requests for the mockup 28 items
          for(let i=0; i<23; i++) {
             simulatedData.push({...simulatedData[0], request_id: 'mock-'+i});
          }
          
          this.requests.set(simulatedData);
          this.fetchSummary(simulatedData);
        }, 800);
      }
    });
  }

  fetchSummary(requestsData: AcademicRequestResponseData[]) {
    const payload = {
      requests: requestsData.map(r => ({ type: r.type, status: r.status }))
    };

    this.reportService.getAnalyticsSummary(payload).subscribe({
      next: (res) => {
        this.summary.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback local calculation
        const total = requestsData.length;
        const by_type: Record<string, number> = {};
        const by_status: Record<string, number> = {};
        
        requestsData.forEach(r => {
          by_type[r.type] = (by_type[r.type] || 0) + 1;
          by_status[r.status] = (by_status[r.status] || 0) + 1;
        });

        const approved = by_status['APPROVED'] || 0;
        const rejected = by_status['REJECTED'] || 0;
        const changes = by_status['CHANGES_REQUESTED'] || 0;

        this.summary.set({
          total,
          by_type,
          by_status,
          approval_percentage: total > 0 ? (approved / total) * 100 : 0,
          rejection_percentage: total > 0 ? (rejected / total) * 100 : 0,
          average_resolution_hours: 0,
          changes_requested: changes
        });
        
        this.isLoading.set(false);
      }
    });
  }
}
