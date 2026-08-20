import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Enrollment } from '../models/enrollment.model';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private http = inject(HttpClient);
  private baseUrl = 'https://localhost:5001/api/v1/enrollments';

  // Use this flag to switch between real API and mock data
  private useMockData = true; // ← Set to false when API is ready

  getAll(): Observable<Enrollment[]> {
    if (this.useMockData) {
      // Mock data for testing
      const mockData: Enrollment[] = [
        {
          id: '1',
          studentId: 101,
          studentName: 'Liya Kebede',
          courseId: 1,
          courseName: 'C# Programming',
          status: 'Pending',
          enrolledAt: new Date().toISOString(),
        },
        {
          id: '2',
          studentId: 102,
          studentName: 'Dawit Tadese',
          courseId: 2,
          courseName: 'Database Systems',
          status: 'Pending',
          enrolledAt: new Date().toISOString(),
        },
        {
          id: '3',
          studentId: 103,
          studentName: 'Sara Hailu',
          courseId: 1,
          courseName: 'C# Programming',
          status: 'Approved',
          enrolledAt: new Date().toISOString(),
        },
        {
          id: '4',
          studentId: 104,
          studentName: 'Meron Assefa',
          courseId: 3,
          courseName: 'Web Development',
          status: 'Rejected',
          enrolledAt: new Date().toISOString(),
        },
        {
          id: '5',
          studentId: 105,
          studentName: 'Henok Alemu',
          courseId: 2,
          courseName: 'Database Systems',
          status: 'Pending',
          enrolledAt: new Date().toISOString(),
        },
      ];

      console.log('📡 Using mock enrollment data');
      return of(mockData).pipe(delay(500)); // Simulate network delay
    }

    console.log('📡 Fetching enrollments from API:', this.baseUrl);
    return this.http.get<Enrollment[]>(this.baseUrl);
  }

  approve(id: string): Observable<void> {
    if (this.useMockData) {
      console.log('✅ Mock approve for enrollment:', id);
      return of(void 0).pipe(delay(300));
    }
    return this.http.post<void>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: string): Observable<void> {
    if (this.useMockData) {
      console.log('✅ Mock reject for enrollment:', id);
      return of(void 0).pipe(delay(300));
    }
    return this.http.post<void>(`${this.baseUrl}/${id}/reject`, {});
  }
}
