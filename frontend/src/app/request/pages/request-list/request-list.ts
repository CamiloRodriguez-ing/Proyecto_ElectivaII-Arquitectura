import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestCardComponent } from '../../components/request-card/request-card.component';
import { RequestService } from '../../services/request.service';
import { AcademicRequestResponseData } from '../../services/request.types';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, RequestCardComponent, RouterLink],
  templateUrl: './request-list.html',
  styleUrl: './request-list.css'
})
export class RequestList implements OnInit {
  private requestService = inject(RequestService);

  requests = signal<AcademicRequestResponseData[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Variables for drawer
  drawerOpen = signal(false);
  selectedRequest = signal<AcademicRequestResponseData | null>(null);

  ngOnInit() {
    this.fetchRequests();
  }

  fetchRequests() {
    this.isLoading.set(true);
    this.error.set(null);
    this.requestService.getRequests().subscribe({
      next: (res) => {
        this.requests.set(res.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        // Fallback for simulation purposes if API is not fully implemented
        this.requests.set(this.getSimulatedRequests());
        this.isLoading.set(false);
      }
    });
  }

  // Developer tool: manually toggle empty state for testing
  forceEmptyState() {
    this.requests.set([]);
  }

  openDrawer(request: AcademicRequestResponseData) {
    this.selectedRequest.set(request);
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.selectedRequest.set(null);
  }

  private getSimulatedRequests(): AcademicRequestResponseData[] {
    return [
      {
        type: 'CREDIT_TRANSFER',
        request_id: '8A41F2C9-1234',
        status: 'UNDER_REVIEW',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        observations: [],
        student: { student_code: '202012345', name: 'Laura Martínez', email: 'laura@uni.edu.co' },
        academic_data: { source_course: 'Cálculo I', target_course: 'Cálculo diferencial', source_credits: 3, target_credits: 3 },
        documents: [{ name: 'contenido-programatico-calculo.pdf', mime_type: 'application/pdf', size_bytes: 1258291 }]
      },
      {
        type: 'CREDIT_TRANSFER',
        request_id: '5F21B904-5678',
        status: 'APPROVED',
        version: 2,
        created_at: '2025-03-12T10:00:00Z',
        updated_at: '2025-03-13T10:00:00Z',
        observations: [],
        student: { student_code: '202012345', name: 'Laura Martínez', email: 'laura@uni.edu.co' },
        academic_data: { source_course: 'Programación I', target_course: 'Fundamentos de programación', source_credits: 4, target_credits: 4 },
        documents: [{ name: 'syllabus-prog-1.pdf', mime_type: 'application/pdf', size_bytes: 2516582 }]
      },
      {
        type: 'CREDIT_TRANSFER',
        request_id: '1D88E3A2-9012',
        status: 'ACTION_REQUIRED',
        version: 1,
        created_at: '2025-03-10T14:30:00Z',
        updated_at: '2025-03-11T09:00:00Z',
        observations: ['El programa no detalla el módulo de inferencia bayesiana ni las horas prácticas de laboratorio requeridas para los 4 créditos.'],
        student: { student_code: '202012345', name: 'Laura Martínez', email: 'laura@uni.edu.co' },
        academic_data: { source_course: 'Estadística básica', target_course: 'Probabilidad y estadística', source_credits: 3, target_credits: 4 },
        documents: []
      }
    ];
  }
}
