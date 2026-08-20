import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { CourseCardComponent } from '../../ui/course-card/course-card.component';
import { Course } from '../../models/course.model';
import { CourseService } from '../../services/course.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CourseCardComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent {
  private readonly courseService = inject(CourseService);

  readonly studentName = signal('Liya Kebede');
  readonly earnedCredits = signal(45);
  readonly selectedCourse = signal<Course | null>(null);

  readonly graduationStatus = computed(() =>
    this.earnedCredits() >= 120 ? 'Eligible for Graduation' : 'In Progress',
  );

  readonly coursesResource = rxResource({
    stream: () => this.courseService.getAll(),
  });

  registerForClass(): void {
    this.earnedCredits.update((credits) => credits + 3);
  }

  handleEnroll(course: Course): void {
    this.selectedCourse.set(course);
    console.log('Enrollment requested for :', course.title);
  }
}
