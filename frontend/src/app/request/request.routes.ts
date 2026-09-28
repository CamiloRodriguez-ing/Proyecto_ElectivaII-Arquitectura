import { Routes } from '@angular/router';

export const REQUEST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/request-form/request-form').then((m) => m.RequestForm),
  },
  {
    path: 'new',
    redirectTo: '',
    pathMatch: 'full'
  }
];
