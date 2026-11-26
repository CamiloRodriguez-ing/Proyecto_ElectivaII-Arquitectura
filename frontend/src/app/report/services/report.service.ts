import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiResponse } from '../../request/services/request.types';
import { AnalyticsSummaryResponse, CubeName, CubeRow } from './report.types';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = inject(RuntimeConfigService).config.apiUrl;

  getAnalyticsSummary(): Observable<ApiResponse<AnalyticsSummaryResponse>> {
    return this.http.get<ApiResponse<AnalyticsSummaryResponse>>(`${this.apiUrl}/analytics/summary`)
      .pipe(catchError(this.handleError));
  }

  getCube(name: CubeName, dimensions: string[]): Observable<ApiResponse<CubeRow[]>> {
    const query = new URLSearchParams({ dimensions: dimensions.join(',') });
    return this.http.get<ApiResponse<CubeRow[]>>(`${this.apiUrl}/analytics/cube/${name}?${query}`)
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
