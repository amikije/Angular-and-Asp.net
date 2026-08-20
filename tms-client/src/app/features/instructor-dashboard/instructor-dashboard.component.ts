import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EnrollmentStore } from '../../store/enrollment.store';
import { CourseStore } from '../../store/course.store';
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
    .dashboard-header {
      padding: 1.5rem;
    }
    .kpi-row {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .kpi-card {
      padding: 1rem 1.5rem;
      border-radius: 8px;
      background: #1e293b;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      min-width: 160px;
    }
    .kpi-card.pending {
      border-left: 4px solid #d97706;
    }
    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
    }
    .kpi-label {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }
    .chart-section {
      margin-top: 2rem;
      padding: 0 1.5rem;
    }
    .skeleton-chart {
      min-height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e293b;
      border: 2px dashed #334155;
      border-radius: 8px;
      color: #64748b;
      font-size: 1rem;
    }
    .spinner {
      min-height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 1rem;
    }
    .course-list {
      margin-top: 2rem;
      padding: 0 1.5rem;
    }
    .course-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .course-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .course-info {
      color: #e2e8f0;
    }
    .course-title {
      font-weight: 600;
    }
    .course-code {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .delete-btn {
      padding: 0.3rem 0.8rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .delete-btn:hover {
      background: #b91c1c;
    }
    .error-message {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 1rem;
      color: #fca5a5;
      margin: 1rem 1.5rem;
    }
  `,
})
export class InstructorDashboardComponent implements OnInit {
  store = inject(EnrollmentStore);
  courseStore = inject(CourseStore);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.store.loadEnrollments();
    this.courseStore.loadCourses();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  deleteCourse(id: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.courseStore.deleteCourse(id);
    }
  }
}
