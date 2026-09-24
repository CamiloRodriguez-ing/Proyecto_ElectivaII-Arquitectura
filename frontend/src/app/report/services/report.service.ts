import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../request/services/request.types';
import { AnalyticsSummaryPayload, AnalyticsSummaryResponse } from './report.types';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAnalyticsSummary(payload: AnalyticsSummaryPayload): Observable<ApiResponse<AnalyticsSummaryResponse>> {
    return this.http.post<ApiResponse<AnalyticsSummaryResponse>>(`${this.apiUrl}/analytics/summary`, payload)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error && error.error.error) {
      return throwError(() => error.error);
    }
    return throwError(() => ({
      error: { code: 'UNKNOWN_ERROR', message: 'Ha ocurrido un error inesperado.' }
    }));
  }
}
