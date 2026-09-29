import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError, tap, of, map } from 'rxjs';
import { AcademicRequestPayload, ApiResponse, ValidateResponseData, AcademicRequestResponseData, ApiError } from './request.types';
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
      .pipe(
        tap(res => {
          if (res && res.data) {
            // Include frontend tenant detection fallback if backend didn't return it
            if (!res.data.tenant_id) {
               res.data.tenant_id = this.getCurrentTenant();
            }
            this.saveToLocalReadModel(res.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  getRequests(): Observable<ApiResponse<AcademicRequestResponseData[]>> {
    const allRequests = this.getAllFromLocalReadModel();
    const currentTenant = this.getCurrentTenant();
    
    // Aislamiento: Filtrar solicitudes por tenant
    const tenantRequests = allRequests.filter(req => req.tenant_id === currentTenant);
    console.log('All Requests:', allRequests);
    console.log('Current Tenant:', currentTenant);
    console.log('Filtered:', tenantRequests);
    
    return of({
      data: tenantRequests,
      meta: { request_id: 'local', api_version: 'v1' }
    });
  }

  getRequestById(id: string): Observable<ApiResponse<AcademicRequestResponseData>> {
    const all = this.getAllFromLocalReadModel();
    const currentTenant = this.getCurrentTenant();
    
    const req = all.find(r => r.request_id === id);
    if (req) {
      // Aislamiento: Validar acceso al recurso
      if (req.tenant_id !== currentTenant) {
        return throwError(() => new Error('Acceso denegado: Esta solicitud pertenece a otro programa.'));
      }
      return of({
        data: req,
        meta: { request_id: 'local', api_version: 'v1' }
      });
    }
    return throwError(() => new Error('Solicitud no encontrada en el sistema local.'));
  }

  evaluateRequest(payload: any): Observable<ApiResponse<any>> {
    // Inject current tenant into actor for frontend payload fallback
    if (!payload.evaluation.actor.tenant_id) {
       payload.evaluation.actor.tenant_id = this.getCurrentTenant();
    }
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/reviews/evaluate`, payload)
      .pipe(
        tap(res => {
          if (res && res.data && res.data.request) {
            this.updateLocalReadModelStatus(res.data.request.request_id, res.data.request.status);
          }
        }),
        catchError(this.handleError)
      );
  }

  // --- MultiTenant Helper ---
  public getCurrentTenant(): string {
    const user = this.authService.currentUser();
    if (!user) return 'default';
    const email = user.email?.toLowerCase() || '';
    if (email.includes('minas')) return 'minas';
    if (email.includes('electronica')) return 'electronica';
    return 'sistemas';
  }

  // --- CQRS Local Read Model Simulation ---
  private getStorageKey() {
    return 'cqrs_read_model_requests';
  }

  private saveToLocalReadModel(req: AcademicRequestResponseData) {
    if (typeof window === 'undefined') return;
    const all = this.getAllFromLocalReadModel();
    if (!req.status) req.status = 'UNDER_REVIEW';
    if (!req.version) req.version = 1;
    if (!req.created_at) req.created_at = new Date().toISOString();
    
    all.push(req);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(all));
  }

  private getAllFromLocalReadModel(): AcademicRequestResponseData[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey());
    return data ? JSON.parse(data) : [];
  }

  private updateLocalReadModelStatus(id: string, newStatus: string) {
    if (typeof window === 'undefined') return;
    const all = this.getAllFromLocalReadModel();
    const index = all.findIndex(r => r.request_id === id);
    if (index >= 0) {
      all[index].status = newStatus;
      all[index].version = (all[index].version || 1) + 1;
      localStorage.setItem(this.getStorageKey(), JSON.stringify(all));
    }
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error && error.error.error) {
      return throwError(() => error.error as ApiError);
    }
    return throwError(() => error);
  }
}
