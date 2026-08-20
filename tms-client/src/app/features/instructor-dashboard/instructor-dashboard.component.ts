import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EnrollmentStore } from '../../store/enrollment.store';
import { AnalyticsChartComponent } from '../../ui/analytics-chart/analytics-chart.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'tms-instructor-dashboard',
  standalone: true,
  imports: [AnalyticsChartComponent],
  templateUrl: './instructor-dashboard.component.html',
  styles: `
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logout-btn {
      padding: 0.5rem 1.5rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    .logout-btn:hover {
      background: #b91c1c;
    }
    /* ... existing styles ... */
  `,
})
export class InstructorDashboardComponent implements OnInit {
  store = inject(EnrollmentStore);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.store.loadEnrollments();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
