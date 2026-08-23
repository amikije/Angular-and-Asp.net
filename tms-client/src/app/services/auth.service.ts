import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// ✅ Interfaces
export interface TmsUser {
  id?: string;
  email: string;
  displayName: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = '/api/v1/auth';

  // ✅ Renamed to avoid conflict - use different names
  private accessToken = signal<string | null>(null);
  private refreshTokenStore = signal<string | null>(null); // ← Renamed
  private tokenExpiry = signal<Date | null>(null);

  currentUser = signal<TmsUser | null>(null);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenStore();
  }

  isAuthenticated(): boolean {
    const token = this.accessToken();
    const expiry = this.tokenExpiry();
    return token !== null && expiry !== null && expiry > new Date();
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role || user?.role === 'Admin';
  }

  async login(credentials: LoginRequest): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials),
    );

    this.accessToken.set(response.accessToken);
    this.refreshTokenStore.set(response.refreshToken);

    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + response.expiresIn);
    this.tokenExpiry.set(expiry);

    this.currentUser.set({
      id: response.user.id,
      email: response.user.email,
      displayName: `${response.user.firstName} ${response.user.lastName}`,
      role: response.user.roles[0] || 'Student',
    });
  }

  // ✅ Method name: refreshAccessToken (not refreshToken)
  async refreshAccessToken(): Promise<boolean> {
    const currentRefreshToken = this.refreshTokenStore();
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
          `${this.baseUrl}/refresh`,
          { refreshToken: currentRefreshToken },
        ),
      );

      this.accessToken.set(response.accessToken);
      this.refreshTokenStore.set(response.refreshToken);

      const expiry = new Date();
      expiry.setSeconds(expiry.getSeconds() + response.expiresIn);
      this.tokenExpiry.set(expiry);

      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  logout(): void {
    this.accessToken.set(null);
    this.refreshTokenStore.set(null);
    this.tokenExpiry.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ✅ Add this method for app.component.ts
  async checkSession(): Promise<void> {
    // Check if we have a valid token
    if (this.isAuthenticated()) {
      // Optionally refresh if about to expire
      const expiry = this.tokenExpiry();
      if (expiry && expiry.getTime() - Date.now() < 60000) {
        // Less than 1 minute
        await this.refreshAccessToken();
      }
      return;
    }

    // Try to refresh if we have a refresh token
    const refreshToken = this.refreshTokenStore();
    if (refreshToken) {
      await this.refreshAccessToken();
    }
  }
}
