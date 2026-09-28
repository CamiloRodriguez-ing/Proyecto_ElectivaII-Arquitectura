import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../request/services/request.types';
import { NotificationItem, PreviewPayload, PreviewResponse } from './notification.types';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getNotifications(): Observable<ApiResponse<NotificationItem[]>> {
    // There's no GET /notifications in API_CONTRACT.md, so we use a mock.
    // In a real scenario, this would be: return this.http.get(...)
    return of({
      meta: { request_id: 'mock', api_version: 'v1' },
      data: [
        {
          id: "SOL-8A41F2C9",
          request_id: "SOL · 8A41F2C9",
          status: "APPROVED",
          recipient_name: "Laura Martínez",
          recipient_email: "laura.martinez@universidad.edu.co",
          date: "12 de marzo de 2025, 10:45 AM",
          subject: "[Aprobada] Solicitud de homologación de asignatura - SOL · 8A41F2C9",
          lead_html: 'Te informamos que tu solicitud de homologación para la asignatura <strong class="text-primary font-semibold">Cálculo diferencial</strong> ha sido <strong class="text-[#15803D] font-bold uppercase">APROBADA</strong> por el Comité Académico de Ciencias Básicas.',
          subject_origin: "Cálculo I",
          subject_origin_credits: "3 Créditos académicos cursados",
          subject_target: "Cálculo diferencial",
          subject_target_credits: "3 Créditos computados",
          observation: '"Se verificaron los temas de límites, derivadas y optimización. Cumple cabalmente con los requisitos curriculares."',
          resolution: "Resolución: Versión 2 - Dictamen favorable",
          event_id: "evt_9941a82f3c01",
          json_payload: {
            event_id: "evt_9941a82f3c01",
            event_type: "request.status_changed.v1",
            timestamp: "2025-03-12T15:45:00Z",
            environment: "demo_sandbox",
            payload: {
              request_id: "SOL-8A41F2C9",
              previous_status: "in_review",
              new_status: "approved"
            }
          },
          isRead: false
        },
        {
          id: "SOL-1D88E3A2",
          request_id: "SOL · 1D88E3A2",
          status: "CHANGES_REQUESTED",
          recipient_name: "Carlos Gómez",
          recipient_email: "carlos.gomez@universidad.edu.co",
          date: "12 de marzo de 2025, 10:18 AM",
          subject: "[Requiere ajustes] Solicitud de homologación - SOL · 1D88E3A2",
          lead_html: 'Tu solicitud de homologación para la asignatura <strong class="text-primary font-semibold">Física Mecánica</strong> se encuentra en estado <strong class="text-[#B45309] font-bold uppercase">REQUIERE AJUSTES</strong>. Por favor anexa el syllabus oficial sellado.',
          subject_origin: "Física General I",
          subject_origin_credits: "4 Créditos académicos",
          subject_target: "Física Mecánica",
          subject_target_credits: "Pendiente de verificación",
          observation: '"El microcurrículo adjuntado carece del sello de decanatura y no desglosa las horas de laboratorio práctico."',
          resolution: "Resolución: Versión 1 - Requerimiento de subsanación",
          event_id: "evt_3821a71c89fe",
          json_payload: {
            event_id: "evt_3821a71c89fe"
          },
          isRead: true
        },
        {
          id: "SOL-9E33B712",
          request_id: "SOL · 9E33B712",
          status: "REJECTED",
          recipient_name: "María Torres",
          recipient_email: "maria.torres@universidad.edu.co",
          date: "11 de marzo de 2025, 04:30 PM",
          subject: "[Rechazada] Notificación sobre solicitud de homologación - SOL · 9E33B712",
          lead_html: 'Lamentamos informarte que tu solicitud de homologación para la asignatura <strong class="text-primary font-semibold">Estructuras de Datos</strong> ha sido <strong class="text-[#B91C1C] font-bold uppercase">RECHAZADA</strong>.',
          subject_origin: "Programación Orientada a Objetos",
          subject_origin_credits: "3 Créditos cursados",
          subject_target: "Estructuras de Datos",
          subject_target_credits: "0 Créditos otorgados",
          observation: '"La equivalencia temática es inferior al 70%. No se cubren grafos, árboles B, ni análisis de complejidad asintótica."',
          resolution: "Resolución: Versión 1 - Dictamen denegatorio",
          event_id: "evt_1180fd909a33",
          json_payload: {
            event_id: "evt_1180fd909a33"
          },
          isRead: false
        }
      ]
    }).pipe(delay(500));
  }

  markAsRead(id: string): Observable<ApiResponse<any>> {
    // Simulated PATCH request
    return of({ meta: { request_id: 'mock', api_version: 'v1' }, data: { success: true } }).pipe(delay(300));
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
