import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Skip auth endpoints
      if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        return throwError(() => err);
      }

      // Handle 401 - try refresh
      if (err.status === 401) {
        // ✅ Use refreshAccessToken (not refreshToken)
        return from(auth.refreshAccessToken()).pipe(
          switchMap((success) => {
            if (success) {
              const token = auth.getAccessToken();
              if (token) {
                const clonedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                return next(clonedReq);
              }
            }
            auth.logout();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }

      // Handle 403
      if (err.status === 403) {
        console.warn('⛔ Access Denied: You do not have permission.');
        router.navigate(['/unauthorized']);
        return throwError(() => err);
      }

      // Handle other errors
      const detailMessage =
        err.error?.detail ?? err.error?.title ?? 'A system error occurred. Please try again.';

      console.warn(`⚠️ ${err.status}:`, detailMessage);
      return throwError(() => err);
    }),
  );
};
