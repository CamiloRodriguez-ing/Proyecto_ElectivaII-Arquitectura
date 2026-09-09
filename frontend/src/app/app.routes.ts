import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./auth/auth.routes').then((r) => r.AUTH_ROUTES),
  },
  {
    path: 'reports',
    loadChildren: () => import('./report/report.routes').then((r) => r.REPORT_ROUTES),
  },
];
