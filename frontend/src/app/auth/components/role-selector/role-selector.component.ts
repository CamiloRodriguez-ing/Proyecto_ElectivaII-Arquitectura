import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DemoRole {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-space-md">
      <label class="block font-label-sm text-label-sm text-on-surface font-semibold mb-space-xs uppercase tracking-wider">
        Seleccionar perfil de simulación:
      </label>
      <div class="grid grid-cols-2 gap-space-xs">
        <button
          *ngFor="let role of roles"
          type="button"
          (click)="selectRole(role)"
          [ngClass]="{
            'bg-surface-container shadow-sm': selectedRoleId === role.id,
            'bg-surface hover:bg-surface-container-high': selectedRoleId !== role.id
          }"
          class="text-left p-space-sm rounded-lg flex flex-col transition font-label-md text-label-md"
        >
          <span
            class="font-semibold"
            [ngClass]="selectedRoleId === role.id ? 'text-primary' : 'text-on-surface'"
          >
            {{ role.name }}
          </span>
          <span class="font-body-sm text-body-sm text-on-surface-variant truncate">
            {{ role.description }}
          </span>
        </button>
      </div>
    </div>
  `
})
export class RoleSelectorComponent {
  @Input() roles: DemoRole[] = [];
  @Input() selectedRoleId: string | null = null;
  
  @Output() roleSelected = new EventEmitter<DemoRole>();

  selectRole(role: DemoRole) {
    this.roleSelected.emit(role);
  }
}
