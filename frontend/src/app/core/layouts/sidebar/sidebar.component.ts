import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="fixed left-0 top-0 h-full w-[260px] bg-tertiary-container text-on-tertiary z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.08)]">
      <div class="flex flex-col">
        <div class="flex items-center gap-3 px-6 py-5 bg-tertiary">
          <img alt="Logo Portal de Solicitudes Académicas" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1UQjp7PW3TYIJtAOGoLV1rOLYJhq8nG9vWxulSc__5aVG607PvT7yD5j88X6GlbmOYaI9IBeB6KrDyv2vz3r9F1G8D2QOmIdmN9ITZZTfm516A0U-0zKWmq-IW-FIK8Wf5XgRRMC40rHksGmZwzY0brvrxBRMmfTYywU497wq-YZLgZjmi4586DuVkTwsZLm1Xeikk1UsV9zlTCSt9UyiabHGmqalKWaTzJC5OGjJ1NUR4dmE9K69C-mw"/>
          <div class="flex flex-col overflow-hidden">
            <span class="font-headline-sm text-headline-sm text-on-tertiary tracking-tight leading-snug truncate">Solicitudes Académicas</span>
            <span class="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">Portal Universitario</span>
          </div>
        </div>
        <div class="px-4 py-3">
          <span class="font-label-sm text-label-sm uppercase tracking-wider text-tertiary-fixed-dim px-3">Navegación</span>
        </div>
        <nav class="flex flex-col gap-1 px-3">
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md" href="#">
            <span class="material-symbols-outlined text-[20px]">folder_open</span><span>Mis solicitudes</span>
          </a>
          <a aria-current="page" class="flex items-center gap-3 px-3 py-2.5 transition-colors bg-primary-container text-on-primary font-label-md rounded-lg shadow-sm border-l-4 border-surface-container-lowest" href="#">
            <span class="material-symbols-outlined text-[20px]">post_add</span><span>Nueva solicitud</span>
          </a>
          <!-- Other links omitted for brevity but they could go here -->
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md" href="#">
            <span class="material-symbols-outlined text-[20px]">fact_check</span><span>Revisión de solicitudes</span>
          </a>
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md" href="#">
            <span class="material-symbols-outlined text-[20px]">visibility</span><span>Previsualizaciones</span>
          </a>
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-tertiary-container hover:bg-tertiary hover:text-on-tertiary transition-colors font-body-md text-body-md" href="#">
            <span class="material-symbols-outlined text-[20px]">query_stats</span><span>Reportes</span>
          </a>
        </nav>
      </div>
      <div class="p-4 bg-tertiary/60 flex flex-col gap-3">
        <div class="flex items-center justify-between px-2 py-1.5 rounded bg-tertiary text-on-tertiary text-code-tabular font-code-tabular">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-secondary-fixed"></span>
            <span class="font-label-sm text-label-sm text-on-tertiary">API OK</span>
          </div>
          <span class="font-label-sm text-label-sm text-tertiary-fixed-dim">v1.0-demo</span>
        </div>
        <a class="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-tertiary hover:bg-primary-container text-on-tertiary transition-colors font-label-md text-label-md" href="#">
          <span class="material-symbols-outlined text-[18px]">help_outline</span><span>Centro de Ayuda</span>
        </a>
      </div>
    </aside>
  `
})
export class SidebarComponent {}
