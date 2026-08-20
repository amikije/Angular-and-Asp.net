import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { EnrollmentStore } from './store/enrollment.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private store = inject(EnrollmentStore);

  async ngOnInit() {
    // ✅ Check session on app startup
    await this.auth.checkSession();

    // Load enrollments if authenticated
    if (this.auth.isAuthenticated()) {
      this.store.loadEnrollments();
      this.store.listenForLiveUpdates();
    }
  }
}
