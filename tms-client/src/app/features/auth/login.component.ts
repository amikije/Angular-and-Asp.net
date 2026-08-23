import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService, LoginRequest } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  error = signal<string | null>(null);
  hidePassword = signal(true);
  isDarkMode = signal(false);

  loginForm = this.fb.group({
    email: ['admin@example.com', [Validators.required, Validators.email]],
    password: ['Password123!', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  constructor() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode.set(true);
      document.body.classList.add('dark-theme');
    }

    effect(() => {
      if (this.isDarkMode()) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  toggleTheme() {
    this.isDarkMode.update((v) => !v);
  }

  togglePasswordVisibility() {
    this.hidePassword.update((v) => !v);
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { email, password } = this.loginForm.getRawValue();
      const credentials: LoginRequest = {
        username: email!,
        password: password!,
      };
      await this.auth.login(credentials);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      this.error.set('Invalid email or password. Please try again.');
      console.error('Login error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}
