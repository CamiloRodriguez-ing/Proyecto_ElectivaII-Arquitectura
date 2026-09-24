import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoleSelectorComponent, DemoRole } from '../../components/role-selector/role-selector.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RoleSelectorComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  roles: DemoRole[] = [
    { id: 'estudiante', name: 'Estudiante', description: 'Laura Martínez' },
    { id: 'revisor', name: 'Revisor Docente', description: 'Andrés Ramírez' },
    { id: 'analista', name: 'Analista', description: 'Comisión Central' },
    { id: 'admin', name: 'Administrador', description: 'Secretaría Académica' }
  ];

  selectedRole = signal<DemoRole>(this.roles[0]);

  get isLoading() {
    return this.authService.isLoading;
  }

  get error() {
    return this.authService.error;
  }

  onRoleSelected(role: DemoRole) {
    this.selectedRole.set(role);
  }

  enterDemoMode() {
    this.authService.loginDemo(this.selectedRole()).subscribe(() => {
      if (!this.error()) {
        // Navigating to dashboard after demo login (simulated)
        // Since we don't know the exact path, let's redirect to root or /requests
        this.router.navigate(['/']);
      }
    });
  }
}
