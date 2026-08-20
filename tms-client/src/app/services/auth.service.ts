import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface TmsUser {
  displayName: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/auth';

  currentUser = signal<TmsUser | null>(null);

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role || user?.role === 'Admin';
  }

  async login(credentials: LoginRequest): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.baseUrl}/login`, credentials));

    const user = await firstValueFrom(this.http.get<TmsUser>(`${this.baseUrl}/me`));

    this.currentUser.set(user);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.baseUrl}/logout`, {}));
    this.currentUser.set(null);
  }

  async checkSession(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<TmsUser>(`${this.baseUrl}/me`));
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }
}
