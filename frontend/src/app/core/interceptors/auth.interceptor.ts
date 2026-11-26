import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { RuntimeConfigService } from '../services/runtime-config.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const runtimeConfig = inject(RuntimeConfigService);
  const authService = inject(AuthService);
  const apiUrl = runtimeConfig.config.apiUrl.replace(/\/$/, '');
  const isApiRequest = request.url === apiUrl || request.url.startsWith(`${apiUrl}/`);
  const isObjectStorageUpload = request.url.includes(':9090/') || request.url.includes('.s3.');
  if (!isApiRequest || isObjectStorageUpload) return next(request);

  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
  const csrfToken = readCookie('academic_csrf');
  const authenticatedRequest = request.clone({
    withCredentials: true,
    setHeaders: unsafe && csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      const authEndpoint = request.url.includes('/auth/login')
        || request.url.includes('/auth/refresh')
        || request.url.includes('/auth/logout');
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || authEndpoint) {
        return throwError(() => error);
      }
      return authService.refreshSession().pipe(
        switchMap(() => {
          const retryCsrf = readCookie('academic_csrf');
          return next(authenticatedRequest.clone({
            setHeaders: unsafe && retryCsrf ? { 'X-CSRF-Token': retryCsrf } : {},
          }));
        }),
        catchError((refreshError) => throwError(() => refreshError)),
      );
    }),
  );
};

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  const value = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : '';
}
