import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  // ✅ Clone the request with withCredentials: true
  // This sends cookies on cross-origin requests
  return next(
    req.clone({
      withCredentials: true,
    }),
  );
};
