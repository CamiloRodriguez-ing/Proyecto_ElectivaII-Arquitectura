import { Routes } from '@angular/router';

export const NOTIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/notification-preview/notification-preview').then((m) => m.NotificationPreviewComponent),
  },
];
