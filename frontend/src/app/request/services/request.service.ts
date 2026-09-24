import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';
import { AcademicRequestPayload, ApiResponse, ValidateResponseData, AcademicRequestResponseData, ApiError } from './request.types';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  private apiUrl = environment.apiUrl || '/v1';

  constructor(private http: HttpClient) {}

  validateRequest(payload: AcademicRequestPayload): Observable<ApiResponse<ValidateResponseData>> {
    return this.http.post<ApiResponse<ValidateResponseData>>(`${this.apiUrl}/requests/validate`, payload)
      .pipe(catchError(this.handleError));
  }

  prepareRequest(payload: AcademicRequestPayload): Observable<ApiResponse<AcademicRequestResponseData>> {
    return this.http.post<ApiResponse<AcademicRequestResponseData>>(`${this.apiUrl}/requests/prepare`, payload)
      .pipe(catchError(this.handleError));
  }

  getRequests(): Observable<ApiResponse<AcademicRequestResponseData[]>> {
    return this.http.get<ApiResponse<AcademicRequestResponseData[]>>(`${this.apiUrl}/requests`)
      .pipe(catchError(this.handleError));
  }

  getRequestById(id: string): Observable<ApiResponse<AcademicRequestResponseData>> {
    return this.http.get<ApiResponse<AcademicRequestResponseData>>(`${this.apiUrl}/requests/${id}`)
      .pipe(catchError(this.handleError));
  }

  evaluateRequest(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reviews/evaluate`, payload)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    // Return the detailed error object (ApiError)
    if (error.error && error.error.error) {
      return throwError(() => error.error as ApiError);
    }
    return throwError(() => error);
  }
}
