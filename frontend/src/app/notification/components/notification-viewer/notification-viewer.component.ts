import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationItem } from '../../services/notification.types';

@Component({
  selector: 'app-notification-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-space-md" *ngIf="notification">
      <!-- Action Toolbar -->
      <div class="flex items-center justify-between bg-surface-container-lowest px-space-lg py-3 rounded-xl shadow-sm flex-wrap gap-space-sm">
        <div class="flex items-center gap-2">
          <span class="flex h-2.5 w-2.5 rounded-full bg-secondary"></span>
          <span class="font-label-md text-label-md text-on-surface font-semibold">Renderizador HTML v2.4</span>
          <span class="text-outline font-body-sm text-body-sm">•</span>
          <span class="font-code-tabular text-code-tabular text-on-surface-variant">RFC-5322 Compliant</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Copy HTML Button -->
          <button 
            (click)="copyHTML()"
            class="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all active:scale-[0.98]" 
            title="Copiar código HTML de la plantilla">
            <span class="material-symbols-outlined text-[18px]">code</span>
            <span>Copiar contenido HTML</span>
            <!-- Ephemeral Tooltip -->
            <span *ngIf="copied()" class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-inverse-surface text-inverse-on-surface font-label-sm text-label-sm rounded shadow-md whitespace-nowrap">
              ¡Copiado al portapapeles!
            </span>
          </button>
          <!-- Export Plain Text Button -->
          <button 
            (click)="exportText()"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all active:scale-[0.98]" 
            title="Descargar versión en texto plano (.txt)">
            <span class="material-symbols-outlined text-[18px]">description</span>
            <span>Exportar texto plano</span>
          </button>
        </div>
      </div>

      <!-- Simulated Email Client Container -->
      <div class="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden flex flex-col" id="email-client-container">
        <!-- Email Metadata Header -->
        <div class="bg-surface-container-low p-space-lg flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <div class="flex items-start justify-between gap-4">
              <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold">
                {{ notification.subject }}
              </h1>
              <div class="flex items-center gap-1 text-on-surface-variant flex-shrink-0">
                <span class="material-symbols-outlined text-[18px]">attachment</span>
                <span class="font-code-tabular text-code-tabular">1 pdf</span>
              </div>
            </div>
            <!-- Envelope Addressing Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 pt-1 text-body-sm font-body-sm text-on-surface-variant">
              <div class="flex items-center gap-2 truncate">
                <span class="font-label-md text-label-md text-outline min-w-[48px]">De:</span>
                <span class="text-on-surface font-medium truncate">Sistema de Solicitudes Académicas &lt;notificaciones&#64;universidad.edu.co&gt;</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-label-md text-label-md text-outline min-w-[48px]">Fecha:</span>
                <span class="text-on-surface">{{ notification.date }}</span>
              </div>
              <div class="flex items-center gap-2 truncate">
                <span class="font-label-md text-label-md text-outline min-w-[48px]">Para:</span>
                <span class="text-on-surface font-medium truncate">{{ notification.recipient_name }} &lt;{{ notification.recipient_email }}&gt;</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-label-md text-label-md text-outline min-w-[48px]">Prioridad:</span>
                <span class="text-primary font-medium">Normal / Institucional</span>
              </div>
            </div>
          </div>
          <!-- Superior Warning Banner -->
          <div class="mt-1 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#FEF3C7] text-[#92400E]">
            <span class="material-symbols-outlined text-[20px] text-[#B45309] flex-shrink-0">info</span>
            <span class="font-body-sm text-body-sm leading-snug">
              <strong>Aviso:</strong> Este mensaje es una vista previa de la plantilla institucional. No se enviará ningún correo real al estudiante durante el modo demostración.
            </span>
          </div>
        </div>

        <!-- Rendered Email Body Canvas -->
        <div class="p-4 sm:p-8 md:p-12 bg-surface-container/30 flex justify-center">
          <div class="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col" id="email-canvas">
            <!-- Email Header -->
            <div class="bg-tertiary px-8 py-6 text-on-tertiary flex items-center justify-between relative overflow-hidden">
              <div class="flex items-center gap-3 z-10">
                <div class="w-10 h-10 rounded bg-surface-container-lowest/15 flex items-center justify-center p-1.5">
                  <span class="material-symbols-outlined text-surface-container-lowest text-[26px]">account_balance</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-headline-sm text-headline-sm tracking-tight text-surface-container-lowest">Universidad Nacional</span>
                  <span class="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">Vicerrectoría Académica • Registro</span>
                </div>
              </div>
              <div class="hidden sm:block text-right z-10">
                <span class="font-code-tabular text-code-tabular text-tertiary-fixed-dim">NOTIF-2025-09</span>
              </div>
              <!-- Decorative graphic accent -->
              <div class="absolute right-0 top-0 bottom-0 w-32 bg-primary/20 -skew-x-12 pointer-events-none"></div>
            </div>
            
            <!-- Welcome Ribbon -->
            <div class="bg-primary px-8 py-2.5 flex items-center justify-between text-on-primary">
              <span class="font-label-md text-label-md font-medium">Resolución Oficial de Solicitud Curricular</span>
              <span class="font-code-tabular text-code-tabular text-primary-fixed">Dictamen Académico</span>
            </div>

            <!-- Email Text & Main Body Flow -->
            <div class="p-8 flex flex-col gap-6">
              <!-- Salutation -->
              <div class="flex flex-col gap-2">
                <p class="font-headline-md text-headline-md text-on-surface font-semibold">
                  Estimado(a) {{ notification.recipient_name }},
                </p>
                <p class="font-body-lg text-body-lg text-on-surface leading-relaxed" [innerHTML]="notification.lead_html">
                </p>
              </div>

              <!-- Homologation Summary Card -->
              <div class="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-label-md uppercase tracking-wider text-outline font-semibold">Resumen de Homologación</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                    100% Compatibilidad
                  </span>
                </div>
                <!-- Subjects Matching Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-surface-container-lowest p-3.5 rounded-lg flex flex-col gap-1">
                    <span class="font-label-sm text-label-sm text-outline">Asignatura de origen</span>
                    <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">{{ notification.subject_origin }}</span>
                    <span class="font-body-sm text-body-sm text-on-surface-variant">{{ notification.subject_origin_credits }}</span>
                  </div>
                  <div class="bg-surface-container-lowest p-3.5 rounded-lg flex flex-col gap-1">
                    <span class="font-label-sm text-label-sm text-outline">Asignatura homologada</span>
                    <span class="font-headline-sm text-headline-sm text-primary font-semibold">{{ notification.subject_target }}</span>
                    <span class="font-body-sm text-body-sm text-on-surface-variant">{{ notification.subject_target_credits }}</span>
                  </div>
                </div>
                <!-- Evaluator Observation -->
                <div class="bg-surface-container-lowest p-4 rounded-lg flex flex-col gap-1.5">
                  <span class="font-label-sm text-label-sm text-outline flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px] text-tertiary">notes</span>
                    Observación del evaluador
                  </span>
                  <p class="font-body-md text-body-md text-on-surface italic leading-relaxed">
                    {{ notification.observation }}
                  </p>
                  <div class="flex items-center justify-between pt-2 text-on-surface-variant font-body-sm text-body-sm">
                    <span class="font-medium text-on-surface">Dr. Andrés Ramírez (Comité Revisor)</span>
                    <span class="font-code-tabular text-code-tabular text-primary">{{ notification.resolution }}</span>
                  </div>
                </div>
              </div>

              <!-- Call to Action simulated in email -->
              <div class="flex flex-col items-center justify-center py-2 gap-2">
                <a class="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-colors text-center w-full sm:w-auto" href="#" onclick="return false;">
                  <span class="material-symbols-outlined text-[20px]">open_in_new</span>
                  <span>Ver detalle en el portal</span>
                </a>
                <span class="font-body-sm text-body-sm text-outline">El enlace requiere autenticación institucional previa.</span>
              </div>

              <!-- Institutional Footer -->
              <div class="pt-6 flex flex-col gap-4 text-on-surface-variant font-body-sm text-body-sm">
                <div class="flex flex-col gap-0.5">
                  <span class="font-label-md text-label-md text-on-surface">Dirección de Admisiones y Registro Académico</span>
                  <span>Comité de Homologaciones y Transferencias de Créditos</span>
                  <span>Campus Universitario Central • Sede Administrativa</span>
                </div>
                <div class="p-3 rounded bg-surface-container-low text-[11px] leading-relaxed text-outline">
                  <strong>Aviso de Confidencialidad:</strong> La información contenida en este correo y sus archivos adjuntos es de carácter confidencial y para uso exclusivo del destinatario registrado en la base de datos de la Universidad. Si por error ha recibido esta comunicación, por favor notifíquelo a <span class="underline">seguridad&#64;universidad.edu.co</span> y proceda a su eliminación inmediata.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Integration Metadata Block (Collapsible) -->
      <div class="bg-surface-container-lowest p-space-lg flex flex-col gap-space-sm">
        <button class="flex items-center justify-between w-full text-left py-1 group" (click)="toggleTechSpecs()" type="button">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[18px]">terminal</span>
            </div>
            <div class="flex flex-col">
              <span class="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors">
                Metadatos de integración (POST /v1/notifications/preview)
              </span>
              <span class="font-body-sm text-body-sm text-outline">Telemetría de evento y payload simulado</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-surface-container font-code-tabular text-[11px] text-primary">JSON SCHEMA 1.2</span>
            <span class="material-symbols-outlined text-outline transition-transform duration-200" [style.transform]="showTechSpecs() ? 'rotate(0deg)' : 'rotate(-90deg)'">expand_more</span>
          </div>
        </button>
        <!-- Collapsible Content -->
        <div class="flex flex-col gap-3 pt-2" [class.hidden]="!showTechSpecs()">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span class="font-label-sm text-label-sm text-outline uppercase">Canal</span>
              <span class="font-code-tabular text-code-tabular text-on-surface font-semibold">EMAIL</span>
            </div>
            <div class="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span class="font-label-sm text-label-sm text-outline uppercase">Tipo de evento</span>
              <span class="font-code-tabular text-code-tabular text-primary font-semibold">{{ notification.json_payload?.event_type || 'request.status_changed.v1' }}</span>
            </div>
            <div class="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
              <span class="font-label-sm text-label-sm text-outline uppercase">ID del evento</span>
              <span class="font-code-tabular text-code-tabular text-on-surface font-semibold">{{ notification.event_id }}</span>
            </div>
          </div>
          <!-- JSON Preview -->
          <div class="relative rounded-lg bg-inverse-surface p-4 overflow-x-auto text-inverse-on-surface font-code-tabular text-code-tabular">
            <div class="absolute right-3 top-3 text-surface-variant font-label-sm text-label-sm opacity-60">
              application/json
            </div>
            <pre class="leading-5"><code>{{ notification.json_payload | json }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationViewerComponent {
  @Input() notification: NotificationItem | null = null;
  
  copied = signal(false);
  showTechSpecs = signal(true);

  toggleTechSpecs() {
    this.showTechSpecs.update(v => !v);
  }

  copyHTML() {
    const el = document.getElementById('email-canvas');
    if (el) {
      navigator.clipboard.writeText(el.outerHTML);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  exportText() {
    if(!this.notification) return;
    const n = this.notification;
    const plainText = `UNIVERSIDAD NACIONAL - REGISTRO ACADÉMICO\n` +
      `===================================================\n` +
      `ASUNTO: ${n.subject}\n` +
      `DE: Sistema de Solicitudes Académicas <notificaciones@universidad.edu.co>\n` +
      `PARA: ${n.recipient_name} <${n.recipient_email}>\n` +
      `FECHA: ${n.date}\n` +
      `===================================================\n\n` +
      `Estimado(a) ${n.recipient_name},\n\n` +
      `Asignatura origen: ${n.subject_origin}\n` +
      `Asignatura destino: ${n.subject_target}\n` +
      `Observación: ${n.observation}\n` +
      `Resolución: ${n.resolution}\n\n` +
      `Consulte el expediente completo en el portal web institucional.`;

    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notificacion-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
