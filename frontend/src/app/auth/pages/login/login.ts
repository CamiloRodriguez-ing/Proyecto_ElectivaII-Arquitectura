import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);

  get isLoading() {
    return this.authService.isLoading;
  }

  get error() {
    return this.authService.error;
  }

  loginWithKeycloak() {
    this.authService.loginRedirect();
  }
}
