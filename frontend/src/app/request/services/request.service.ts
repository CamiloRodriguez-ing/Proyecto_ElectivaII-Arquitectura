import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError, switchMap, map } from 'rxjs';
import { AcademicRequestPayload, ApiResponse, ValidateResponseData, AcademicRequestResponseData, ApiError, DocumentUploadResponse } from './request.types';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = environment.apiUrl || '/v1';
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  validateRequest(payload: AcademicRequestPayload): Observable<ApiResponse<ValidateResponseData>> {
    return this.http.post<ApiResponse<ValidateResponseData>>(`${this.apiUrl}/requests/validate`, payload)
      .pipe(catchError(this.handleError));
  }

  prepareRequest(payload: AcademicRequestPayload): Observable<ApiResponse<AcademicRequestResponseData>> {
    return this.http.post<ApiResponse<AcademicRequestResponseData>>(`${this.apiUrl}/requests/prepare`, payload)
      .pipe(catchError(this.handleError));
  }

  uploadDocument(file: File): Observable<{ document_id: string }> {
    return this.http.post<ApiResponse<DocumentUploadResponse>>(`${this.apiUrl}/documents/upload-url`, {
      name: file.name,
      mime_type: file.type || 'application/pdf',
      size_bytes: file.size
    }).pipe(
      switchMap(response => this.http.put(response.data.upload_url, file, {
        headers: { 'Content-Type': file.type || 'application/pdf' },
        responseType: 'text'
      }).pipe(map(() => ({ document_id: response.data.document_id })))),
      catchError(this.handleError)
    );
  }

  getRequests(): Observable<ApiResponse<AcademicRequestResponseData[]>> {
    return this.http.get<ApiResponse<AcademicRequestResponseData[]>>(`${this.apiUrl}/requests`)
      .pipe(catchError(this.handleError));
  }

  getRequestById(id: string): Observable<ApiResponse<AcademicRequestResponseData>> {
    return this.http.get<ApiResponse<AcademicRequestResponseData>>(`${this.apiUrl}/requests/${encodeURIComponent(id)}`)
      .pipe(catchError(this.handleError));
  }

  evaluateRequest(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reviews/evaluate`, payload)
      .pipe(catchError(this.handleError));
  }

  // --- MultiTenant Helper ---
  public getCurrentTenant(): string {
    return environment.tenantId;
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error && error.error.error) {
      return throwError(() => error.error as ApiError);
    }
    return throwError(() => error);
  }
}

