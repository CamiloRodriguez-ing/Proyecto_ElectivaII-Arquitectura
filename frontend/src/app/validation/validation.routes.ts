import { Routes } from '@angular/router';

export const VALIDATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/validation-review/validation-review').then((m) => m.ValidationReview),
  },
];
