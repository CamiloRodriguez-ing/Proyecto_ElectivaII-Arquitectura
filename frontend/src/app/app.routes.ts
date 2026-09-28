import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./auth/auth.routes').then((r) => r.AUTH_ROUTES),
  },
  {
    path: 'requests',
    loadChildren: () => import('./request/request.routes').then((r) => r.REQUEST_ROUTES),
  },
  {
    path: 'validation',
    loadChildren: () => import('./validation/validation.routes').then((r) => r.VALIDATION_ROUTES),
  }
];
