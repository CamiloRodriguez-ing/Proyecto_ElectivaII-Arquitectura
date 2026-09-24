import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { NotificationService } from '../../services/notification.service';
import { NotificationItem } from '../../services/notification.types';
import { NotificationListComponent } from '../../components/notification-list/notification-list.component';
import { NotificationViewerComponent } from '../../components/notification-viewer/notification-viewer.component';

@Component({
  selector: 'app-notification-preview',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, NotificationListComponent, NotificationViewerComponent],
  templateUrl: './notification-preview.html'
})
export class NotificationPreviewComponent implements OnInit {
  private notificationService = inject(NotificationService);

  notifications = signal<NotificationItem[]>([]);
  selectedNotification = signal<NotificationItem | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res.data || []);
        if (this.notifications().length > 0) {
          this.selectNotification(this.notifications()[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  selectNotification(notif: NotificationItem) {
    this.selectedNotification.set(notif);
    
    // Mark as read logic
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe(() => {
        this.notifications.update(list => list.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        
        // Update selected if it's the same
        const currentSelected = this.selectedNotification();
        if (currentSelected && currentSelected.id === notif.id) {
          this.selectedNotification.set({ ...currentSelected, isRead: true });
        }
      });
    }
  }
}
