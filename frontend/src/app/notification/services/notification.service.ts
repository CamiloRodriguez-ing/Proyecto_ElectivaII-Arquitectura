import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiResponse } from '../../request/services/request.types';
import { NotificationItem, PreviewPayload, PreviewResponse } from './notification.types';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = inject(RuntimeConfigService).config.apiUrl;

  getNotifications(): Observable<ApiResponse<NotificationItem[]>> {
    return this.http.get<ApiResponse<NotificationItem[]>>(`${this.apiUrl}/notifications`)
      .pipe(catchError(this.handleError));
  }

  markAsRead(id: string): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/notifications/${encodeURIComponent(id)}/read`, {})
      .pipe(catchError(this.handleError));
  }

  getPreview(payload: PreviewPayload): Observable<ApiResponse<PreviewResponse>> {
    return this.http.post<ApiResponse<PreviewResponse>>(`${this.apiUrl}/notifications/preview`, payload)
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
