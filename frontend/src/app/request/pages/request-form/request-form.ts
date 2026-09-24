import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestService } from '../../services/request.service';
import { AcademicRequestPayload, ApiError, AcademicRequestResponseData } from '../../services/request.types';

// Import newly extracted components
import { StudentSummaryComponent } from '../../components/student-summary/student-summary.component';
import { AcademicSummaryComponent } from '../../components/academic-summary/academic-summary.component';
import { DocumentSummaryComponent } from '../../components/document-summary/document-summary.component';
import { ValidationChecklistComponent } from '../../components/validation-checklist/validation-checklist.component';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    CommonModule, 
    MainLayoutComponent,
    StudentSummaryComponent,
    AcademicSummaryComponent,
    DocumentSummaryComponent,
    ValidationChecklistComponent
  ],
  templateUrl: './request-form.html',
  styleUrl: './request-form.css'
})
export class RequestForm {
  private requestService = inject(RequestService);

  payload: AcademicRequestPayload = {
    type: "CREDIT_TRANSFER",
    student: {
      student_code: "202012345",
      name: "Laura Martínez",
      email: "laura.martinez@universidad.edu.co"
    },
    academic_data: {
      source_course: "Cálculo I",
      target_course: "Cálculo Diferencial",
      source_credits: 3,
      target_credits: 3
    },
    documents: [
      {
        name: "contenido-programatico-calculo.pdf",
        mime_type: "application/pdf",
        size_bytes: 1200000
      }
    ]
  };

  legalConsent = signal(false);
  isSubmitting = signal(false);
  isValidating = signal(false);
  validationOk = signal(false);
  
  apiError = signal<ApiError | null>(null);
  successData = signal<AcademicRequestResponseData | null>(null);
  showSuccessModal = signal(false);

  setConsent(value: boolean) {
    this.legalConsent.set(value);
  }

  validateData() {
    this.isValidating.set(true);
    this.apiError.set(null);
    this.validationOk.set(false);
    
    this.requestService.validateRequest(this.payload).subscribe({
      next: (res) => {
        if (res.data.valid) {
          this.validationOk.set(true);
        }
        this.isValidating.set(false);
      },
      error: (err) => {
        this.isValidating.set(false);
        this.apiError.set(err);
      }
    });
  }

  prepareRequest() {
    if (!this.legalConsent() || this.isSubmitting()) return;
    
    this.isSubmitting.set(true);
    this.apiError.set(null);
    this.successData.set(null);

    this.requestService.prepareRequest(this.payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successData.set(res.data);
        this.showSuccessModal.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.apiError.set(err);
      }
    });
  }

  closeModal() {
    this.showSuccessModal.set(false);
  }
}
