import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="unauthorized-container">
      <h1>🚫 403 Unauthorized</h1>
      <p>You don't have permission to access this page.</p>
      <a routerLink="/dashboard">Return to Dashboard</a>
    </div>
  `,
  styles: `
    .unauthorized-container {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    a {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 2rem;
      background: #6366f1;
      color: white;
      text-decoration: none;
      border-radius: 8px;
    }
    a:hover {
      background: #4f46e5;
    }
  `,
})
export class UnauthorizedComponent {}
