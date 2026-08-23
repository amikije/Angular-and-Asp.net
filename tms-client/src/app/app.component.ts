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
    // ✅ checkSession now exists
    await this.auth.checkSession();

    if (this.auth.isAuthenticated()) {
      this.store.loadEnrollments();
      this.store.listenForLiveUpdates();
    }
  }
}
