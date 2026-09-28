import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestService } from '../../services/request.service';
import { AcademicRequestPayload, ApiError, AcademicRequestResponseData } from '../../services/request.types';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MainLayoutComponent
  ],
  templateUrl: './request-form.html',
  styleUrl: './request-form.css'
})
export class RequestForm {
  private requestService = inject(RequestService);

  payload: AcademicRequestPayload = {
    type: "CREDIT_TRANSFER",
    student: {
      student_code: "",
      name: "",
      email: ""
    },
    academic_data: {
      source_course: "",
      target_course: "",
      source_credits: 0,
      target_credits: 0
    },
    documents: []
  };

  fileName = "";

  isValidating = signal(false);
  validationOk = signal(false);
  isSubmitting = signal(false);
  apiError = signal<ApiError | null>(null);
  successResponse = signal<AcademicRequestResponseData | null>(null);
  
  legalConsent = signal(false);

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      this.payload.documents = [
        {
          name: file.name,
          mime_type: file.type || 'application/pdf',
          size_bytes: file.size
        }
      ];
    } else {
      this.fileName = "";
      this.payload.documents = [];
    }
  }

  validateRequest() {
    this.isValidating.set(true);
    this.apiError.set(null);
    this.validationOk.set(false);
    
    this.requestService.validateRequest(this.payload).subscribe({
      next: (res) => {
        if (res.data.valid) {
          this.validationOk.set(true);
        } else {
          // Si valid = false, mostrar un error
          this.apiError.set({
            error: {
               code: 'VALIDATION_FAILED',
               message: 'Errores en la validación de la solicitud.',
               details: res.data.errors?.map(e => ({ field: 'General', reason: e.toString() })) || []
            },
            meta: { request_id: '', api_version: '' }
          });
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
    if (!this.legalConsent() || this.isSubmitting() || !this.validationOk()) return;
    
    this.isSubmitting.set(true);
    this.apiError.set(null);
    this.successResponse.set(null);

    this.requestService.prepareRequest(this.payload).subscribe({
      next: (res) => {
        this.successResponse.set(res.data);
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.apiError.set(err);
      }
    });
  }
}
