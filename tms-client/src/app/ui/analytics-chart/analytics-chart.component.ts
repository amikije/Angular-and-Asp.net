import { Component, computed, input } from '@angular/core';
import { Enrollment } from '../../models/enrollment.model';

@Component({
  selector: 'tms-analytics-chart',
  standalone: true,
  template: `
    <div class="chart-container">
      <h3>Enrollment Analytics</h3>
      <div class="chart-bars">
        <div class="bar approved" [style.height.px]="approvedHeight()">
          <span>Approved</span>
        </div>
        <div class="bar pending" [style.height.px]="pendingHeight()">
          <span>Pending</span>
        </div>
        <div class="bar rejected" [style.height.px]="rejectedHeight()">
          <span>Rejected</span>
        </div>
      </div>
      <p class="chart-summary">Total records: {{ data().length }}</p>
    </div>
  `,
  styles: `
    .chart-container {
      padding: 1.5rem;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
    }
    .chart-bars {
      display: flex;
      gap: 2rem;
      align-items: flex-end;
      height: 200px;
      padding: 1rem 0;
    }
    .bar {
      width: 80px;
      border-radius: 4px 4px 0 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      min-height: 20px;
    }
    .bar.approved {
      background: #059669;
    }
    .bar.pending {
      background: #d97706;
    }
    .bar.rejected {
      background: #dc2626;
    }
    .chart-summary {
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #94a3b8;
    }
  `,
})
export class AnalyticsChartComponent {
  data = input.required<Enrollment[]>();

  approvedHeight = computed(() => {
    const count = this.data().filter((e) => e.status === 'Approved').length;
    return Math.max(20, count * 3);
  });

  pendingHeight = computed(() => {
    const count = this.data().filter((e) => e.status === 'Pending').length;
    return Math.max(20, count * 3);
  });

  rejectedHeight = computed(() => {
    const count = this.data().filter((e) => e.status === 'Rejected').length;
    return Math.max(20, count * 3);
  });
}
