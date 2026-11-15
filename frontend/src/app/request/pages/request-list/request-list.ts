import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../../../core/layouts/main-layout/main-layout.component';
import { RequestCardComponent } from '../../components/request-card/request-card.component';
import { RequestService } from '../../services/request.service';
import { AcademicRequestResponseData } from '../../services/request.types';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, RequestCardComponent, RouterLink],
  templateUrl: './request-list.html',
  styleUrl: './request-list.css'
})
export class RequestList implements OnInit {
  private requestService = inject(RequestService);

  requests = signal<AcademicRequestResponseData[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Variables for drawer
  drawerOpen = signal(false);
  selectedRequest = signal<AcademicRequestResponseData | null>(null);

  ngOnInit() {
    this.fetchRequests();
  }

  fetchRequests() {
    this.isLoading.set(true);
    this.error.set(null);
    this.requestService.getRequests().subscribe({
      next: (res) => {
        this.requests.set(res.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.error.set(err?.error?.message || 'No fue posible cargar las solicitudes.');
        this.requests.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // Developer tool: manually toggle empty state for testing
  forceEmptyState() {
    this.requests.set([]);
  }

  openDrawer(request: AcademicRequestResponseData) {
    this.selectedRequest.set(request);
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.selectedRequest.set(null);
  }

}
