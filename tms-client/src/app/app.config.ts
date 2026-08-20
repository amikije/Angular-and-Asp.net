import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { routes } from './app.routes';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // ✅ Add credentials interceptor
      withInterceptors([credentialsInterceptor]),
      // ✅ Configure XSRF protection
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN', // Cookie name set by .NET server
        headerName: 'X-XSRF-TOKEN', // Header expected by .NET server
      }),
    ),
  ],
};
