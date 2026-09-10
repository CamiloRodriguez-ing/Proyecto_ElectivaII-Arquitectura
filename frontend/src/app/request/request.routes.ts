import { Routes } from '@angular/router';

export const REQUEST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/request-list/request-list').then((m) => m.RequestList),
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/request-form/request-form').then((m) => m.RequestForm),
  },
];
