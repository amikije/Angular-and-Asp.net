import { Component, input, output } from '@angular/core';
import { Course } from '../../models/course.model';
import { RouterLink } from '@angular/router'; // ← ADD THIS

@Component({
  selector: 'tms-course-card',
  standalone: true,
  imports: [RouterLink], // ← ADD THIS
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss',
})
export class CourseCardComponent {
  course = input.required<Course>();
  enrollClicked = output<Course>();
}
