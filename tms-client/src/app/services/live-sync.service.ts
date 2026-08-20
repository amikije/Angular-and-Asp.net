import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Subject } from 'rxjs';

export interface EnrollmentStatusEvent {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

@Injectable({
  providedIn: 'root',
})
export class LiveSyncService {
  private platformId = inject(PLATFORM_ID);
  private connection: HubConnection | null = null;
  private eventsSubject = new Subject<EnrollmentStatusEvent>();

  // Expose events as observable
  events$ = this.eventsSubject.asObservable();

  // Connection state signal
  connectionState = signal<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  connect() {
    // Guard against duplicate connections
    if (this.connection) return;

    // Skip on server-side rendering
    if (!isPlatformBrowser(this.platformId)) return;

    console.log('🔌 Connecting to SignalR hub...');

    this.connection = new HubConnectionBuilder()
      .withUrl('/hubs/tms')
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    // Listen for enrollment status updates
    this.connection.on(
      'ReceiveEnrollmentStatusUpdated',
      (enrollmentId: string, status: 'Pending' | 'Approved' | 'Rejected') => {
        console.log('📨 Real-time update received:', { enrollmentId, status });
        this.eventsSubject.next({ id: enrollmentId, status });
      },
    );

    // Connection state events
    this.connection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      this.connectionState.set('reconnecting');
    });

    this.connection.onreconnected(() => {
      console.log('✅ SignalR reconnected');
      this.connectionState.set('connected');
    });

    this.connection.onclose(() => {
      console.log('❌ SignalR disconnected');
      this.connectionState.set('disconnected');
    });

    // Start connection
    this.connection
      .start()
      .then(() => {
        console.log('✅ SignalR connected');
        this.connectionState.set('connected');
      })
      .catch((err) => {
        console.error('❌ SignalR connection error:', err);
        this.connectionState.set('disconnected');
      });
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
      this.connectionState.set('disconnected');
    }
  }
}
