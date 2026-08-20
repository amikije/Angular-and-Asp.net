import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Course, CourseDetail, PagedResponse } from '../models/course.model';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/courses`;

  getAll(): Observable<Course[]> {
    console.log('📡 Fetching courses from:', this.base);

    return this.http
      .get<PagedResponse<Course>>(this.base, {
        params: { page: '1', pageSize: '50' },
      })
      .pipe(
        map((response) => {
          console.log('✅ Courses loaded:', response.items?.length || 0);
          return response.items || [];
        }),
        catchError((error) => {
          console.error('❌ Error fetching courses:', error);
          return throwError(() => error);
        }),
      );
  }

  getById(id: string): Observable<CourseDetail> {
    console.log('📡 Fetching course details for ID:', id);

    return this.http.get<CourseDetail>(`${this.base}/${id}`).pipe(
      catchError((error) => {
        console.error(`❌ Error fetching course ${id}:`, error);
        return throwError(() => error);
      }),
    );
  }
}
