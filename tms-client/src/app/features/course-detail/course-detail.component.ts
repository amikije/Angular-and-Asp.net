import { Component, input, effect } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [RouterLink], // ← Needed for navigation links
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent {
  // This receives the :id from the URL
  // The name MUST match the route parameter name
  id = input.required<string>();

  constructor() {
    // effect() runs whenever id() changes
    effect(() => {
      console.log(`Loading course detail for ID: ${this.id()}`);
    });
  }
}
