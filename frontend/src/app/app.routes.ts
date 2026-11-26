import { Routes } from '@angular/router';
import { authGuard } from './auth/services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./auth/auth.routes').then((r) => r.AUTH_ROUTES),
  },
  {
    path: 'requests',
    canActivate: [authGuard],
    loadChildren: () => import('./request/request.routes').then((r) => r.REQUEST_ROUTES),
  },
  {
    path: 'validation',
    canActivate: [authGuard],
    loadChildren: () => import('./validation/validation.routes').then((r) => r.VALIDATION_ROUTES),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadChildren: () => import('./report/report.routes').then((r) => r.REPORT_ROUTES),
  }
];
