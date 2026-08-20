import { Injectable, inject } from '@angular/core'; // ← Change this
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Course, CourseDetail, PagedResponse } from '../models/course.model';

@Injectable({
  // ← Change from @Service()
  providedIn: 'root', // ← Add this
})
export class CourseService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:5001/api/v1/courses';

  getAll() {
    return this.http
      .get<PagedResponse<Course>>(this.baseUrl, {
        params: { page: '1', pageSize: '50' },
      })
      .pipe(map((p) => p.items));
  }

  getById(id: string) {
    return this.http.get<CourseDetail>(`${this.baseUrl}/${id}`);
  }
}
