import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { ReportChartsComponent } from '../../components/report-charts/report-charts.component';
import { ReportService } from '../../services/report.service';
import { AnalyticsSummaryResponse, CubeRow } from '../../services/report.types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, MetricCardComponent, ReportChartsComponent],
  template: `
    <app-main-layout>
      <div class="flex flex-col w-full gap-space-lg">
        <section class="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p class="font-label-md text-primary">ANÁLISIS OLAP · APACHE DRUID</p>
            <h1 class="font-headline-xl text-headline-xl text-on-surface">Cubo de solicitudes académicas</h1>
            <p class="font-body-md text-on-surface-variant mt-2">
              Datos históricos consumidos desde Kafka. Fuente analítica independiente de PostgreSQL.
            </p>
            <div class="flex flex-wrap gap-2 mt-3 text-label-sm">
              <span class="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D]">● Druid en tiempo casi real</span>
              <span class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                Actualizado: {{ refreshedAt() || 'pendiente' }}
              </span>
            </div>
          </div>
          <button (click)="loadData()" [disabled]="isLoading()"
            class="px-4 py-2 rounded-lg bg-primary text-on-primary disabled:opacity-50">
            {{ isLoading() ? 'Consultando…' : 'Actualizar cubos' }}
          </button>
        </section>

        @if (error()) {
          <div class="p-4 rounded-lg bg-[#FEE2E2] text-[#991B1B]">{{ error() }}</div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-metric-card [isLoading]="isLoading()" title="Solicitudes históricas"
            [value]="(summary()?.total || 0).toString()" icon="database"
            [footerTextLeft]="'Ventana de 12 meses'"></app-metric-card>
          <app-metric-card [isLoading]="isLoading()" title="Tasa de aprobación"
            [value]="(summary()?.approval_percentage || 0).toFixed(1) + '%'" icon="check_circle"
            valueColorClass="text-[#15803D]" iconBgClass="bg-[#DCFCE7]" iconTextClass="text-[#15803D]"
            [footerTextLeft]="(summary()?.by_status?.['APPROVED'] || 0) + ' aprobadas'"></app-metric-card>
          <app-metric-card [isLoading]="isLoading()" title="Tiempo medio de resolución"
            [value]="summary()?.average_resolution_hours != null ? summary()!.average_resolution_hours!.toFixed(1) + ' h' : 'N/D'"
            icon="schedule" [footerTextLeft]="'Desde envío hasta decisión'"></app-metric-card>
          <app-metric-card [isLoading]="isLoading()" title="Iteraciones de ajuste"
            [value]="(summary()?.changes_requested || 0).toString()" icon="cycle"
            valueColorClass="text-[#B45309]" iconBgClass="bg-[#FEF3C7]" iconTextClass="text-[#B45309]"
            [footerTextLeft]="'Eventos únicos en Kafka'"></app-metric-card>
        </div>

        <app-report-charts [isLoading]="isLoading()" [total]="summary()?.total || 0"
          [byStatus]="summary()?.by_status || {}" [byType]="summary()?.by_type || {}"></app-report-charts>

        <section class="bg-surface-container-lowest p-6 rounded-xl shadow-sm overflow-x-auto">
          <h2 class="font-headline-md text-headline-md">Cubo 1 · Resultados por mes y estado</h2>
          <p class="text-on-surface-variant mb-4">Drill-down: año → mes → estado.</p>
          <table class="w-full text-left min-w-[720px]">
            <thead class="bg-surface-container-low"><tr><th>Año</th><th>Mes</th><th>Estado</th><th>Solicitudes</th><th>Aprobadas</th><th>Rechazadas</th><th>Horas promedio</th></tr></thead>
            <tbody>@for (row of requestsCube(); track $index) {
              <tr class="border-b border-surface-container"><td>{{ row['year'] }}</td><td>{{ row['month'] }}</td><td>{{ row['status'] }}</td><td>{{ row['request_count'] }}</td><td>{{ row['approved_count'] }}</td><td>{{ row['rejected_count'] }}</td><td>{{ number(row['average_resolution_hours']) }}</td></tr>
            }</tbody>
          </table>
        </section>

        <section class="bg-surface-container-lowest p-6 rounded-xl shadow-sm overflow-x-auto">
          <h2 class="font-headline-md text-headline-md">Cubo 2 · Equivalencias de asignaturas</h2>
          <p class="text-on-surface-variant mb-4">Slice por par origen/destino y resultado.</p>
          <table class="w-full text-left min-w-[820px]">
            <thead class="bg-surface-container-low"><tr><th>Origen</th><th>Destino</th><th>Estado</th><th>Casos</th><th>Créditos solicitados</th><th>Créditos aprobados</th></tr></thead>
            <tbody>@for (row of equivalencesCube(); track $index) {
              <tr class="border-b border-surface-container"><td>{{ row['source_course'] }}</td><td>{{ row['target_course'] }}</td><td>{{ row['status'] }}</td><td>{{ row['request_count'] }}</td><td>{{ row['requested_credits'] }}</td><td>{{ row['approved_credits'] }}</td></tr>
            }</tbody>
          </table>
        </section>

        <section class="bg-surface-container-lowest p-6 rounded-xl shadow-sm overflow-x-auto">
          <h2 class="font-headline-md text-headline-md">Cubo 3 · Desempeño de revisión</h2>
          <p class="text-on-surface-variant mb-4">Comparación por rol revisor y decisión.</p>
          <table class="w-full text-left min-w-[680px]">
            <thead class="bg-surface-container-low"><tr><th>Año</th><th>Mes</th><th>Rol</th><th>Decisión</th><th>Revisiones</th><th>Respuesta promedio (h)</th></tr></thead>
            <tbody>@for (row of processingCube(); track $index) {
              <tr class="border-b border-surface-container"><td>{{ row['year'] }}</td><td>{{ row['month'] }}</td><td>{{ row['reviewer_role'] }}</td><td>{{ row['decision'] }}</td><td>{{ row['review_count'] }}</td><td>{{ number(row['average_response_hours']) }}</td></tr>
            }</tbody>
          </table>
        </section>
      </div>
    </app-main-layout>
  `,
  styles: [`th, td { padding: .75rem 1rem; white-space: nowrap; } th { font-weight: 600; }`]
})
export class DashboardComponent implements OnInit {
  private reportService = inject(ReportService);

  summary = signal<AnalyticsSummaryResponse | null>(null);
  requestsCube = signal<CubeRow[]>([]);
  equivalencesCube = signal<CubeRow[]>([]);
  processingCube = signal<CubeRow[]>([]);
  isLoading = signal(true);
  error = signal('');
  refreshedAt = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set('');
    forkJoin({
      summary: this.reportService.getAnalyticsSummary(),
      requests: this.reportService.getCube('requests', ['year', 'month', 'status']),
      equivalences: this.reportService.getCube('equivalences', ['source_course', 'target_course', 'status']),
      processing: this.reportService.getCube('processing-times', ['year', 'month', 'reviewer_role', 'decision'])
    }).subscribe({
      next: result => {
        this.summary.set(result.summary.data);
        this.requestsCube.set(result.requests.data);
        this.equivalencesCube.set(result.equivalences.data);
        this.processingCube.set(result.processing.data);
        this.refreshedAt.set(new Date().toLocaleString('es-CO'));
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No fue posible consultar Druid. Verifique el supervisor Kafka y vuelva a intentar.');
        this.isLoading.set(false);
      }
    });
  }

  number(value: string | number | null): string {
    return value == null ? 'N/D' : Number(value).toFixed(1);
  }
}
