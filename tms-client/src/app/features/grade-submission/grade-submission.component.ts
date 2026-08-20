import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, exhaustMap } from 'rxjs';
import { GradeService, GradePayload } from '../../services/grade.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-grade-submission',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './grade-submission.component.html',
  styles: `
    .container {
      max-width: 600px;
      margin: 2rem auto;
    }
    .card {
      padding: 1.5rem;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #e2e8f0;
    }
    .card-subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
    }
    .form-field {
      width: 100%;
      margin-bottom: 1rem;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 0.5rem 0;
    }
    .status-message {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #0f172a;
      color: #38bdf8;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid #334155;
    }
    .status-message.error {
      color: #f87171;
      border-color: #7f1d1d;
    }
    .status-message.success {
      color: #34d399;
      border-color: #065f46;
    }
    .submit-button {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
    }
  `,
})
export class GradeSubmissionComponent implements OnDestroy {
  private api = inject(GradeService);
  private fb = inject(FormBuilder);

  // Reactive Form
  gradeForm = this.fb.group({
    studentId: [101, [Validators.required, Validators.min(1)]],
    courseId: [302, [Validators.required, Validators.min(1)]],
    score: [88, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  isSubmitting = signal(false);
  submissionStatus = signal<string | null>(null);
  statusClass = signal('');

  // Subject - manual event stream for clicks
  private submitClick$ = new Subject<GradePayload>();

  constructor() {
    // 🔥 The Magic: exhaustMap prevents rage-clicks!
    this.submitClick$
      .pipe(
        exhaustMap((payload) => {
          this.isSubmitting.set(true);
          this.submissionStatus.set('📤 Submitting grade to server...');
          this.statusClass.set('');
          return this.api.postGrade(payload);
        }),
        takeUntilDestroyed(), // Auto-unsubscribe on component destroy
      )
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          this.submissionStatus.set(`✅ Grade saved! Record ID: ${result.id}`);
          this.statusClass.set('success');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submissionStatus.set(`❌ Submission failed: ${err.message || 'Server error'}`);
          this.statusClass.set('error');
          console.error('Grade submission error:', err);
        },
      });
  }

  onSubmit() {
    if (this.gradeForm.valid) {
      const raw = this.gradeForm.getRawValue();
      const payload: GradePayload = {
        studentId: Number(raw.studentId),
        courseId: Number(raw.courseId),
        score: Number(raw.score),
      };
      console.log('🎯 Submit clicked, pushing to stream');
      this.submitClick$.next(payload);
    } else {
      this.gradeForm.markAllAsTouched();
    }
  }

  ngOnDestroy() {
    // Subject cleanup (takeUntilDestroyed handles this automatically)
    this.submitClick$.complete();
  }
}
