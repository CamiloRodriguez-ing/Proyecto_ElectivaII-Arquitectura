import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="fixed top-0 left-[260px] right-0 z-40 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="bg-surface-container text-primary font-body-sm text-body-sm px-6 py-1.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px] text-primary">info</span>
          <span>Modo demostración: los datos se conservan únicamente durante esta sesión y no se almacenan de forma permanente.</span>
        </div>
        <button class="font-label-sm text-label-sm text-primary hover:underline" type="button">Restablecer datos</button>
      </div>
      <div class="h-16 px-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img alt="Logo Portal de Solicitudes Académicas" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1UQjp7PW3TYIJtAOGoLV1rOLYJhq8nG9vWxulSc__5aVG607PvT7yD5j88X6GlbmOYaI9IBeB6KrDyv2vz3r9F1G8D2QOmIdmN9ITZZTfm516A0U-0zKWmq-IW-FIK8Wf5XgRRMC40rHksGmZwzY0brvrxBRMmfTYywU497wq-YZLgZjmi4586DuVkTwsZLm1Xeikk1UsV9zlTCSt9UyiabHGmqalKWaTzJC5OGjJ1NUR4dmE9K69C-mw"/>
          <nav class="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span class="hover:text-on-surface cursor-pointer">Portal</span>
            <span class="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
            <span class="text-on-surface font-headline-sm">Expedientes y Trámites</span>
          </nav>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg">
            <span class="font-label-sm text-label-sm text-on-surface-variant">Rol demo:</span>
            <select class="bg-transparent font-label-md text-label-md text-on-surface focus:outline-none cursor-pointer">
              <option value="student">Estudiante (Laura Martínez)</option>
              <option value="reviewer">Revisor (Andrés Ramírez)</option>
              <option value="analyst">Analista Curricular</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button class="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" type="button">
            <span class="material-symbols-outlined text-[20px]">notifications</span>
            <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error"></span>
          </button>
          <div class="flex items-center gap-3 pl-3">
            <div class="flex flex-col text-right hidden sm:flex">
              <span class="font-label-md text-label-md text-on-surface">Laura Martínez</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">l.martinez@universidad.edu</span>
            </div>
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {}
