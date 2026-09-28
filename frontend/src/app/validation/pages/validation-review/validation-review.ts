import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestService } from '../../../request/services/request.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AcademicRequestResponseData } from '../../../request/services/request.types';

@Component({
  selector: 'app-validation-review',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Evaluación y Validación</h1>
          <p class="text-gray-600">Selecciona una solicitud pendiente para evaluarla y registrar la decisión en el sistema central.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Lista de Solicitudes (Read Model) -->
          <div class="lg:col-span-5 flex flex-col gap-4">
            <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Solicitudes Pendientes</h2>
            
            <div *ngIf="requests().length === 0" class="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">inbox</span>
              <p class="text-gray-500">No hay solicitudes pendientes en el sistema local.</p>
              <p class="text-xs text-gray-400 mt-2">Inicia sesión como Estudiante y crea una solicitud para que aparezca aquí.</p>
            </div>

            <div 
              *ngFor="let req of requests()" 
              (click)="selectRequest(req)"
              [ngClass]="{'border-blue-500 ring-1 ring-blue-500 bg-blue-50': selectedRequest()?.request_id === req.request_id, 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 bg-white': selectedRequest()?.request_id !== req.request_id}"
              class="p-4 rounded-xl shadow-sm border cursor-pointer transition-all"
            >
              <div class="flex items-start justify-between mb-2">
                <span class="font-mono text-xs font-semibold text-blue-600 truncate mr-2">{{ req.request_id }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" 
                      [ngClass]="{'bg-yellow-100 text-yellow-800': req.status === 'UNDER_REVIEW', 'bg-green-100 text-green-800': req.status === 'APPROVED', 'bg-red-100 text-red-800': req.status === 'REJECTED'}">
                  {{ req.status }}
                </span>
              </div>
              <h3 class="font-bold text-gray-900 text-sm mb-1">{{ req.student.name }} ({{ req.student.student_code }})</h3>
              <p class="text-sm text-gray-600 truncate">{{ req.academic_data.source_course }} → {{ req.academic_data.target_course }}</p>
              <div class="text-xs text-gray-400 mt-3 flex items-center justify-between">
                <span>{{ req.type }}</span>
                <span>{{ req.created_at | date:'short' }}</span>
              </div>
            </div>
          </div>

          <!-- Formulario de Evaluación -->
          <div class="lg:col-span-7">
            <h2 class="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Acciones de Evaluación</h2>
            
            <div *ngIf="!selectedRequest()" class="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">touch_app</span>
              <p class="text-gray-500">Selecciona una solicitud de la lista para evaluarla.</p>
            </div>

            <div *ngIf="selectedRequest()" class="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              
              <div *ngIf="successMessage()" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-3">
                <span class="material-symbols-outlined mt-0.5">check_circle</span>
                <div>
                  <p class="font-medium">¡Decisión registrada correctamente!</p>
                  <p class="text-sm mt-1">La evaluación fue enviada al sistema central y se encoló el evento.</p>
                </div>
              </div>
              
              <div *ngIf="errorMessage()" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
                <span class="material-symbols-outlined mt-0.5">error</span>
                <div>
                  <p class="font-medium">Error al registrar la decisión</p>
                  <p class="text-sm mt-1">{{ errorMessage() }}</p>
                </div>
              </div>

              <!-- Resumen de la Solicitud Seleccionada -->
              <div class="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                <h4 class="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Detalles para revisión</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="block text-gray-500 text-xs">Estudiante</span>
                    <span class="font-medium text-gray-900">{{ selectedRequest()?.student?.name }}</span>
                  </div>
                  <div>
                    <span class="block text-gray-500 text-xs">Correo</span>
                    <span class="font-medium text-gray-900">{{ selectedRequest()?.student?.email }}</span>
                  </div>
                  <div>
                    <span class="block text-gray-500 text-xs">Origen</span>
                    <span class="font-medium text-gray-900">{{ selectedRequest()?.academic_data?.source_course }} ({{ selectedRequest()?.academic_data?.source_credits }} cr.)</span>
                  </div>
                  <div>
                    <span class="block text-gray-500 text-xs">Destino</span>
                    <span class="font-medium text-gray-900">{{ selectedRequest()?.academic_data?.target_course }} ({{ selectedRequest()?.academic_data?.target_credits }} cr.)</span>
                  </div>
                  <div class="col-span-2 mt-2 pt-2 border-t border-blue-100">
                    <span class="block text-gray-500 text-xs">Documento adjunto</span>
                    <span class="font-medium text-blue-600 flex items-center gap-1 mt-1">
                      <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      {{ selectedRequest()?.documents?.[0]?.name || 'Sin documento' }}
                    </span>
                  </div>
                </div>
              </div>

              <form (ngSubmit)="submitDecision()" class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Decisión</label>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label class="relative flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all" [ngClass]="{'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500': decision() === 'APPROVE', 'border-gray-200 hover:bg-gray-50 text-gray-700': decision() !== 'APPROVE'}">
                      <input type="radio" name="decision" value="APPROVE" (change)="decision.set('APPROVE')" class="sr-only">
                      <span class="material-symbols-outlined text-[20px]">check_circle</span>
                      <span class="font-medium text-sm">Aprobar</span>
                    </label>

                    <label class="relative flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all" [ngClass]="{'border-yellow-500 bg-yellow-50 text-yellow-700 ring-1 ring-yellow-500': decision() === 'REQUEST_CHANGES', 'border-gray-200 hover:bg-gray-50 text-gray-700': decision() !== 'REQUEST_CHANGES'}">
                      <input type="radio" name="decision" value="REQUEST_CHANGES" (change)="decision.set('REQUEST_CHANGES')" class="sr-only">
                      <span class="material-symbols-outlined text-[20px]">warning</span>
                      <span class="font-medium text-sm text-center leading-tight">Requerir Cambios</span>
                    </label>

                    <label class="relative flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all" [ngClass]="{'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500': decision() === 'REJECT', 'border-gray-200 hover:bg-gray-50 text-gray-700': decision() !== 'REJECT'}">
                      <input type="radio" name="decision" value="REJECT" (change)="decision.set('REJECT')" class="sr-only">
                      <span class="material-symbols-outlined text-[20px]">cancel</span>
                      <span class="font-medium text-sm">Rechazar</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Observaciones (Requerido)</label>
                  <textarea 
                    [(ngModel)]="observation" 
                    name="observation" 
                    required
                    rows="3" 
                    placeholder="Justificación académica de la decisión tomada..."
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <div class="pt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    type="submit" 
                    [disabled]="isSubmitting() || !observation.trim()"
                    class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span *ngIf="isSubmitting()" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span *ngIf="!isSubmitting()" class="material-symbols-outlined text-[18px]">send</span>
                    Registrar Evaluación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </app-main-layout>
  `
})
export class ValidationReview implements OnInit {
  private requestService = inject(RequestService);
  private authService = inject(AuthService);

  requests = signal<AcademicRequestResponseData[]>([]);
  selectedRequest = signal<AcademicRequestResponseData | null>(null);
  
  decision = signal<'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'>('APPROVE');
  observation = '';
  
  isSubmitting = signal(false);
  successMessage = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.requestService.getRequests().subscribe({
      next: (res) => {
        // Mostrar primero las más recientes
        const sorted = (res.data || []).sort((a, b) => {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        this.requests.set(sorted);
      }
    });
  }

  selectRequest(req: AcademicRequestResponseData) {
    this.selectedRequest.set(req);
    this.successMessage.set(false);
    this.errorMessage.set('');
    this.observation = '';
    this.decision.set('APPROVE');
  }

  submitDecision() {
    const req = this.selectedRequest();
    if (!req || !this.observation.trim()) return;
    
    this.isSubmitting.set(true);
    this.successMessage.set(false);
    this.errorMessage.set('');

    const payload = {
      request: {
        request_id: req.request_id,
        status: req.status || 'UNDER_REVIEW',
        version: req.version || 1
      },
      evaluation: {
        decision: this.decision(),
        actor: {
          id: this.authService.currentUser()?.id || 'unknown',
          role: this.authService.currentUser()?.name || 'Revisor'
        },
        observation: this.observation
      }
    };

    this.requestService.evaluateRequest(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(true);
        this.selectedRequest.set(null); // Deseleccionar
        this.loadRequests(); // Recargar la lista para ver el nuevo estado
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Error de conexión con el servidor AWS');
      }
    });
  }
}
