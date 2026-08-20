import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnrollmentStore } from './store/enrollment.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private store = inject(EnrollmentStore);

  ngOnInit() {
    // Load enrollments and start listening for live updates
    this.store.loadEnrollments();
    this.store.listenForLiveUpdates();
    console.log('🚀 App initialized with live sync enabled');
  }
}
