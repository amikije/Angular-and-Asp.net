import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GradePayload {
  studentId: number;
  courseId: number;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class GradeService {
  private http = inject(HttpClient);
  private baseUrl = '/api/grades';

  postGrade(payload: GradePayload): Observable<{ id: string; success: boolean }> {
    console.log('📡 Sending grade:', payload);
    return this.http.post<{ id: string; success: boolean }>(this.baseUrl, payload);
  }
}
