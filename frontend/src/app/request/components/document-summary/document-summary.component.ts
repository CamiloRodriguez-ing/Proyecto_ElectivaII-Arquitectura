import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestDocument } from '../../services/request.types';

@Component({
  selector: 'app-document-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <div class="flex items-center justify-between pb-space-md mb-space-md bg-surface-container-low -mx-space-lg -mt-space-lg px-space-lg pt-space-md rounded-t-xl">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[22px]">description</span>
          <h2 class="font-headline-md text-headline-md text-on-surface">3. Soporte documental adjunto</h2>
        </div>
        <span class="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-md font-semibold">{{ documents.length }} Archivo verificado</span>
      </div>
      
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-space-md rounded-xl bg-surface-container-low gap-space-md">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0 shadow-sm">
            <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">picture_as_pdf</span>
          </div>
          <div class="flex flex-col min-w-0" *ngIf="documents.length > 0">
            <span class="font-headline-sm text-headline-sm text-on-surface truncate">{{ documents[0].name }}</span>
            <div class="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              <span class="font-code-tabular">{{ documents[0].mime_type }}</span>
              <span>•</span>
              <span class="font-code-tabular font-semibold">{{ (documents[0].size_bytes / 1024 / 1024).toFixed(1) }} MB</span>
              <span>•</span>
              <span class="text-secondary font-medium">Hash SHA-256 verificado</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant text-label-md font-label-md flex items-center gap-1.5 transition-colors" type="button">
            <span class="material-symbols-outlined text-[16px]">visibility</span>
            <span>Previsualizar</span>
          </button>
          <button class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" title="Eliminar archivo" type="button">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      
      <div class="mt-space-md flex items-start gap-3 p-3.5 rounded-xl bg-surface-container text-on-surface-variant font-body-sm text-body-sm">
        <span class="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
        <p>
          <strong class="text-on-surface font-medium">Tratamiento de archivos en demostración:</strong> En esta etapa el sistema procesa únicamente los metadatos y firmas de verificación del archivo. El documento no será cargado ni almacenado permanentemente en servidores centrales.
        </p>
      </div>
    </div>
  `
})
export class DocumentSummaryComponent {
  @Input({ required: true }) documents!: RequestDocument[];
}
