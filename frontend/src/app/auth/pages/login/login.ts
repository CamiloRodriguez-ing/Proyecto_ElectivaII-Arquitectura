import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);

  readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(1024)]],
  });

  get isLoading() {
    return this.authService.isLoading;
  }

  get error() {
    return this.authService.error;
  }

  async submit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { username, password } = this.loginForm.getRawValue();
    try {
      await this.authService.login(username, password);
    } catch {
      this.loginForm.controls.password.reset();
    }
  }
}
