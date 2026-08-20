import { Component, viewChild, effect, inject } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { EnrollmentStore } from '../../store/enrollment.store';
import { Enrollment } from '../../models/enrollment.model';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './enrollment-list.component.html',
  styles: `
    table {
      width: 100%;
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.approved {
      background: #065f46;
      color: #a7f3d0;
    }
    .status-badge.pending {
      background: #78350f;
      color: #fde68a;
    }
    .status-badge.rejected {
      background: #7f1d1d;
      color: #fca5a5;
    }
    button {
      padding: 0.4rem 1rem;
      border: none;
      border-radius: 6px;
      background: #4f46e5;
      color: white;
      cursor: pointer;
      font-size: 0.85rem;
    }
    button:hover {
      background: #4338ca;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class EnrollmentListComponent {
  store = inject(EnrollmentStore);

  displayedColumns: string[] = ['studentName', 'courseName', 'status', 'actions'];
  dataSource = new MatTableDataSource<Enrollment>();

  readonly paginator = viewChild.required(MatPaginator);
  readonly sort = viewChild.required(MatSort);

  constructor() {
    // Push store entities into Material data source
    effect(() => {
      this.dataSource.data = this.store.entities();
    });

    // Wire paginator and sort controls
    effect(() => {
      this.dataSource.paginator = this.paginator();
      this.dataSource.sort = this.sort();
    });

    // Load enrollments
    this.store.loadEnrollments();
  }

  onApprove(id: string) {
    this.store.approveEnrollment(id);
  }

  onReject(id: string) {
    this.store.rejectEnrollment(id);
  }
}
