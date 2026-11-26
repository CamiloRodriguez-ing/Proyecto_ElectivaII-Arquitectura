import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, map, shareReplay, tap } from 'rxjs';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';

export interface SessionUser {
  subject: string;
  username: string;
  name: string;
  email: string;
  tenant_id: string;
  roles: string[];
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  username: string;
  email: string;
}

interface AuthResponse {
  data: { user: SessionUser; expires_in?: number };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private refreshRequest?: Observable<SessionUser>;

  readonly currentUser = signal<UserRole | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async login(username: string, password: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { username, password }, { withCredentials: true }),
      );
      this.setUser(response.data.user);
      await this.router.navigateByUrl(this.routeFor(response.data.user.roles));
    } catch (error) {
      this.currentUser.set(null);
      this.error.set(this.messageFor(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async ensureSession(): Promise<boolean> {
    if (this.currentUser()) return true;
    try {
      const response = await firstValueFrom(
        this.http.get<AuthResponse>(`${this.apiUrl}/auth/me`, { withCredentials: true }),
      );
      this.setUser(response.data.user);
      return true;
    } catch {
      this.currentUser.set(null);
      return false;
    }
  }

  refreshSession(): Observable<SessionUser> {
    if (!this.refreshRequest) {
      this.refreshRequest = this.http
        .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          map((response) => response.data.user),
          tap((user) => this.setUser(user)),
          finalize(() => (this.refreshRequest = undefined)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshRequest;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }));
    } catch {
      // The UI still drops its session if Keycloak is temporarily unavailable.
    } finally {
      this.currentUser.set(null);
      await this.router.navigateByUrl('/');
    }
  }

  private setUser(user: SessionUser): void {
    const expectedTenant = this.runtimeConfig.config.tenantId.toLowerCase();
    if (expectedTenant && expectedTenant !== 'default' && user.tenant_id.toLowerCase() !== expectedTenant) {
      throw new Error('La cuenta no pertenece al portal académico seleccionado.');
    }
    const role = this.primaryRole(user.roles);
    this.currentUser.set({
      id: role.id,
      name: role.name,
      description: user.name || user.username,
      username: user.username,
      email: user.email,
    });
  }

  private primaryRole(roles: string[]): { id: string; name: string } {
    if (roles.includes('ADMINISTRATOR')) return { id: 'admin', name: 'Administrador' };
    if (roles.includes('ANALYST')) return { id: 'analista', name: 'Analista' };
    if (roles.includes('REVIEWER')) return { id: 'revisor', name: 'Revisor docente' };
    if (roles.includes('STUDENT')) return { id: 'estudiante', name: 'Estudiante' };
    throw new Error('La cuenta no tiene un rol habilitado para este portal.');
  }

  private routeFor(roles: string[]): string {
    if (roles.includes('ANALYST') || roles.includes('ADMINISTRATOR')) return '/reports';
    if (roles.includes('REVIEWER')) return '/validation';
    return '/requests';
  }

  private messageFor(error: unknown): string {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) return error.message;
    if (error instanceof HttpErrorResponse) {
      return error.error?.error?.message || 'No fue posible iniciar sesión. Intenta nuevamente.';
    }
    return 'No fue posible iniciar sesión. Intenta nuevamente.';
  }

  private get apiUrl(): string {
    return this.runtimeConfig.config.apiUrl.replace(/\/$/, '');
  }
}
