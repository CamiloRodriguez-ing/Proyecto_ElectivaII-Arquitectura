import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestService } from '../../../request/services/request.service';
import { AcademicRequestResponseData, EvaluationPayload } from '../../../request/services/request.types';
import { DecisionType, ReviewFormComponent } from '../../components/review-form/review-form.component';
import { ReviewModalComponent } from '../../components/review-modal/review-modal.component';

@Component({
  selector: 'app-validation-review',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, ReviewFormComponent, ReviewModalComponent],
  templateUrl: './validation-review.html',
  styleUrl: './validation-review.css'
})
export class ValidationReview implements OnInit {
  private requestService = inject(RequestService);

  requestData = signal<AcademicRequestResponseData | null>(null);
  isLoading = signal(true);
  
  // Modal state
  showModal = signal(false);
  pendingDecision = signal<DecisionType>('APPROVE');
  pendingObservation = signal('');
  
  // Submission state
  isSubmitting = signal(false);
  isResolved = signal(false);

  ngOnInit() {
    this.loadRequest();
  }

  loadRequest() {
    this.isLoading.set(true);
    // Mocking an ID since we're not hooking up routing params properly yet.
    // In a real app we'd use ActivatedRoute.
    const mockId = '8a41f2c9-3e91-49b2-a42e-18e472091a11';
    
    this.requestService.getRequestById(mockId).subscribe({
      next: (res) => {
        this.requestData.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        // Fallback to simulated data for demo
        this.requestData.set({
          request_id: '8a41f2c9-3e91-49b2-a42e-18e472091a11',
          type: 'CREDIT_TRANSFER',
          status: 'UNDER_REVIEW',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          observations: [],
          student: {
            student_code: '202012345',
            name: 'Laura Martínez',
            email: 'laura.martinez@universidad.edu.co'
          },
          academic_data: {
            source_course: 'Cálculo I',
            target_course: 'Cálculo Diferencial',
            source_credits: 3,
            target_credits: 3
          },
          documents: [
            {
              name: 'contenido-programatico-calculo.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1258291
            }
          ]
        });
        this.isLoading.set(false);
      }
    });
  }

  onRequestDecision(event: {decision: DecisionType, observation: string}) {
    this.pendingDecision.set(event.decision);
    this.pendingObservation.set(event.observation);
    this.showModal.set(true);
  }

  cancelDecision() {
    this.showModal.set(false);
  }

  confirmDecision() {
    const data = this.requestData();
    if (!data) return;

    this.isSubmitting.set(true);

    const payload: EvaluationPayload = {
      request: {
        request_id: data.request_id,
        status: data.status,
        version: data.version
      },
      evaluation: {
        decision: this.pendingDecision(),
        actor: {
          id: 'revisor-024',
          role: 'coordinador'
        },
        observation: this.pendingObservation()
      }
    };

    this.requestService.evaluateRequest(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showModal.set(false);
        this.isResolved.set(true);
        // Update local state with new status and version
        if (this.requestData()) {
          this.requestData.update(d => {
            if (d) {
              return { ...d, status: res.data?.request?.status || this.mapDecisionToStatus(this.pendingDecision()), version: res.data?.request?.version || d.version + 1 };
            }
            return d;
          });
        }
      },
      error: () => {
        // Fallback simulate success
        setTimeout(() => {
          this.isSubmitting.set(false);
          this.showModal.set(false);
          this.isResolved.set(true);
          this.requestData.update(d => {
            if (d) {
              return { ...d, status: this.mapDecisionToStatus(this.pendingDecision()), version: d.version + 1 };
            }
            return d;
          });
        }, 1000);
      }
    });
  }

  private mapDecisionToStatus(decision: DecisionType): string {
    if (decision === 'APPROVE') return 'APPROVED';
    if (decision === 'REQUEST_CHANGES') return 'ACTION_REQUIRED';
    return 'REJECTED';
  }
}
