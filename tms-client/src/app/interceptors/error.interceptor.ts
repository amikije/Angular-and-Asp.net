import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Extract RFC 7807 ProblemDetails detail property
      const detailMessage =
        err.error?.detail ?? err.error?.title ?? 'A system error occurred. Please try again.';

      if (err.status === 401) {
        // Redirect expired or unauthenticated sessions back to login
        console.warn('🔒 Session expired. Redirecting to login...');
        router.navigate(['/login']);
      } else if (err.status === 403) {
        console.warn('⛔ Forbidden: You do not have permission.');
      } else if (err.status === 409) {
        console.warn('⚠️ Conflict:', detailMessage);
      } else if (err.status === 400) {
        console.warn('⚠️ Bad Request:', detailMessage);
      } else if (err.status === 404) {
        console.warn('🔍 Not Found:', detailMessage);
      } else if (err.status === 500) {
        console.error('💥 Server Error:', detailMessage);
      } else {
        console.error('❌ API Error Response:', detailMessage);
      }

      return throwError(() => err);
    }),
  );
};
