import { Component, inject, signal, OnInit, effect } from '@angular/core';
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
                      [ngClass]="{'bg-yellow-100 text-yellow-800': req.status === 'UNDER_REVIEW' || req.status === 'SUBMITTED', 'bg-green-100 text-green-800': req.status === 'APPROVED', 'bg-red-100 text-red-800': req.status === 'REJECTED' || req.status === 'CHANGES_REQUESTED'}">
                  {{ req.status }}
                </span>
              </div>
              <h3 class="font-bold text-gray-900 text-sm mb-1">{{ req.student.name }} ({{ req.student.student_code }})</h3>
              <p class="text-sm text-gray-600 truncate">{{ req.academic_data.source_course }} &rarr; {{ req.academic_data.target_course }}</p>
              <div class="text-xs text-gray-400 mt-3 flex items-center justify-between">
                <span>{{ req.type }}</span>
                <span>{{ req.created_at | date:'short' }}</span>
              </div>
            </div>
          </div>

          <!-- Panel de Detalles y Decisión -->
          <div class="lg:col-span-7">
            <h2 class="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Acciones de Evaluación</h2>
            
            <div *ngIf="!selectedRequest()" class="flex flex-col items-center justify-center h-[400px] border border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-400">
              <span class="material-symbols-outlined text-4xl mb-3">touch_app</span>
              <p>Selecciona una solicitud de la lista para evaluarla.</p>
            </div>

            <div *ngIf="selectedRequest() as req" class="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
              <!-- Detalles de la Solicitud -->
              <div class="p-6 bg-gray-50 border-b">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-xl font-bold text-gray-900">{{ req.student.name }}</h3>
                    <p class="text-sm text-gray-500">{{ req.student.email }} | Código: {{ req.student.student_code }}</p>
                  </div>
                  <span class="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold">{{ req.type }}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mt-6 p-4 bg-white rounded-lg border">
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Materia Origen</p>
                    <p class="font-medium text-gray-900">{{ req.academic_data.source_course }}</p>
                    <p class="text-sm text-gray-500">{{ req.academic_data.source_credits }} créditos</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Materia Destino</p>
                    <p class="font-medium text-gray-900">{{ req.academic_data.target_course }}</p>
                    <p class="text-sm text-gray-500">{{ req.academic_data.target_credits }} créditos</p>
                  </div>
                </div>
              </div>

              <!-- Formulario de Evaluación -->
              <div class="p-6 flex-grow flex flex-col">
                
                <div *ngIf="successMessage()" class="mb-6 bg-green-50 text-green-800 p-4 rounded-lg border border-green-200 flex items-start gap-3">
                  <span class="material-symbols-outlined text-green-500">check_circle</span>
                  <div>
                    <p class="font-bold">¡Evaluación registrada con éxito!</p>
                    <p class="text-sm">El evento ha sido emitido y guardado localmente.</p>
                  </div>
                </div>

                <div *ngIf="errorMessage()" class="mb-6 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                  <span class="material-symbols-outlined text-red-500">error</span>
                  <div>
                    <p class="font-bold">Error en la evaluación</p>
                    <p class="text-sm">{{ errorMessage() }}</p>
                  </div>
                </div>

                <div class="space-y-6 flex-grow">
                  <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Decisión:</label>
                    <div class="flex gap-4">
                      <label class="flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50" [ngClass]="{'border-green-500 ring-1 ring-green-500 bg-green-50 hover:bg-green-50': decision === 'APPROVED'}">
                        <input type="radio" name="decision" value="APPROVED" [(ngModel)]="decision" class="sr-only">
                        <span class="material-symbols-outlined mr-2" [ngClass]="{'text-green-600': decision === 'APPROVED', 'text-gray-400': decision !== 'APPROVED'}">check_circle</span>
                        <span [ngClass]="{'font-bold text-green-700': decision === 'APPROVED', 'font-medium text-gray-700': decision !== 'APPROVED'}">Aprobar</span>
                      </label>
                      <label class="flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50" [ngClass]="{'border-red-500 ring-1 ring-red-500 bg-red-50 hover:bg-red-50': decision === 'REJECTED'}">
                        <input type="radio" name="decision" value="REJECTED" [(ngModel)]="decision" class="sr-only">
                        <span class="material-symbols-outlined mr-2" [ngClass]="{'text-red-600': decision === 'REJECTED', 'text-gray-400': decision !== 'REJECTED'}">cancel</span>
                        <span [ngClass]="{'font-bold text-red-700': decision === 'REJECTED', 'font-medium text-gray-700': decision !== 'REJECTED'}">Rechazar</span>
                      </label>
                      <label class="flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50" [ngClass]="{'border-yellow-500 ring-1 ring-yellow-500 bg-yellow-50 hover:bg-yellow-50': decision === 'CHANGES_REQUESTED'}">
                        <input type="radio" name="decision" value="CHANGES_REQUESTED" [(ngModel)]="decision" class="sr-only">
                        <span class="material-symbols-outlined mr-2" [ngClass]="{'text-yellow-600': decision === 'CHANGES_REQUESTED', 'text-gray-400': decision !== 'CHANGES_REQUESTED'}">edit_document</span>
                        <span [ngClass]="{'font-bold text-yellow-700': decision === 'CHANGES_REQUESTED', 'font-medium text-gray-700': decision !== 'CHANGES_REQUESTED'}">Ajustar</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Observaciones Técnicas:</label>
                    <textarea 
                      [(ngModel)]="observation"
                      rows="4" 
                      class="w-full px-4 py-3 rounded-lg border-gray-300 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-sm"
                      placeholder="Justifica la decisión para el estudiante..."></textarea>
                  </div>
                </div>

                <div class="mt-8 flex justify-end">
                  <button 
                    (click)="submitReview()"
                    [disabled]="isSubmitting() || !decision || !observation.trim()"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <span *ngIf="isSubmitting()" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span *ngIf="!isSubmitting()" class="material-symbols-outlined text-sm">send</span>
                    Registrar Decisión
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </app-main-layout>
  `
})
export class ValidationReview {
  private requestService = inject(RequestService);
  private authService = inject(AuthService);

  requests = signal<AcademicRequestResponseData[]>([]);
  selectedRequest = signal<AcademicRequestResponseData | null>(null);
  
  decision = '';
  observation = '';
  
  isSubmitting = signal(false);
  successMessage = signal(false);
  errorMessage = signal('');

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        this.loadRequests();
      }
    });
  }

  ngOnInit() {
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
    this.decision = '';
  }

  submitReview() {
    const req = this.selectedRequest();
    const user = this.authService.currentUser();
    if (!req || !user || !this.decision || !this.observation.trim()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set(false);

    const payload = {
      request: req,
      evaluation: {
        decision: this.decision,
        observation: this.observation,
        actor: {
          id: user.username || user.email,
          role: 'REVIEWER'
        }
      }
    };

    this.requestService.evaluateRequest(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(true);
        // Refresh requests logic
        this.loadRequests();
        if (res.data?.request) {
           this.selectedRequest.set(res.data.request);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Ocurrió un error al registrar la evaluación');
      }
    });
  }
}