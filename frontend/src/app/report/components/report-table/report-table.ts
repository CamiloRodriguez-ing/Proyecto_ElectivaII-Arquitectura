import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicRequestResponseData } from '../../../request/services/request.types';

@Component({
  selector: 'app-report-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-table.html'
})
export class ReportTableComponent {
  @Input() isLoading = false;
  
  _requests = signal<AcademicRequestResponseData[]>([]);
  @Input() set requests(value: AcademicRequestResponseData[]) {
    this._requests.set(value || []);
  }

  searchQuery = signal('');
  statusFilter = signal('ALL');

  filteredRequests = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    
    return this._requests().filter(r => {
      const matchStatus = st === 'ALL' || r.status === st;
      const matchQuery = q === '' || 
        r.student.name.toLowerCase().includes(q) || 
        r.academic_data.source_course.toLowerCase().includes(q) ||
        r.academic_data.target_course.toLowerCase().includes(q);
      
      return matchStatus && matchQuery;
    });
  });

  getStatusBadgeClasses(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-[#DCFCE7] text-[#15803D]';
      case 'UNDER_REVIEW': return 'bg-[#FEF3C7] text-[#B45309]';
      case 'ACTION_REQUIRED': return 'bg-[#FFFBEB] text-[#B45309]';
      case 'REJECTED': return 'bg-[#FEE2E2] text-[#B91C1C]';
      case 'SUBMITTED': return 'bg-[#E0F2FE] text-[#0369A1]';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  }

  getStatusIconColor(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-[#15803D]';
      case 'UNDER_REVIEW': return 'bg-[#B45309]';
      case 'ACTION_REQUIRED': return 'bg-transparent text-[#B45309]';
      case 'REJECTED': return 'bg-[#B91C1C]';
      case 'SUBMITTED': return 'bg-[#0369A1]';
      default: return 'bg-outline';
    }
  }
}
