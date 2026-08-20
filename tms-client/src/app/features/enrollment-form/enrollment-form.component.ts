import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';

@Component({
  selector: 'app-enrollment-form',
  standalone: true,
  imports: [ReactiveFormsModule], // Required for form directives
  templateUrl: './enrollment-form.component.html',
  styleUrl: './enrollment-form.component.scss',
})
export class EnrollmentFormComponent {
  // Inject the FormBuilder service (like dependency injection in .NET)
  private fb = inject(FormBuilder);

  // Track if form was submitted successfully
  submitted = signal(false);

  // Build the form with validation rules
  form = this.fb.nonNullable.group({
    studentId: ['', [Validators.required, Validators.pattern('^STU-[0-9]{4}$')]],
    courseId: ['', Validators.required],
    term: ['Fall 2026', Validators.required],
    notes: [''],
    backupCourses: this.fb.array<FormControl<string>>([]),
  });

  // Getter for backup courses (shortcut)
  get backups() {
    return this.form.controls.backupCourses;
  }

  // Add a backup course field
  addBackup() {
    this.backups.push(
      this.fb.control('', {
        nonNullable: true,
        validators: Validators.required,
      }),
    );
  }

  // Remove a backup course field
  removeBackup(index: number) {
    this.backups.removeAt(index);
  }

  // Submit the form
  submit() {
    if (this.form.valid) {
      const payload = this.form.getRawValue();
      console.log('Enrollment payload:', payload);
      this.submitted.set(true);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
