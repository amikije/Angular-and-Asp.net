import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, patchState, withState } from '@ngrx/signals';
import { withEntities, setAllEntities, updateEntity } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, concatMap, tap, catchError, EMPTY } from 'rxjs';
import { EnrollmentService } from '../services/enrollment.service';
import { Enrollment } from '../models/enrollment.model';

export const EnrollmentStore = signalStore(
  { providedIn: 'root' },

  // State: Loading and error flags
  withState({
    isLoading: false,
    error: null as string | null,
  }),

  // Entities: O(1) indexed dictionary for enrollments
  withEntities<Enrollment>(),

  // Computed: Derived values that auto-update
  withComputed((store) => ({
    pendingCount: computed(() => store.entities().filter((e) => e.status === 'Pending').length),
    approvedCount: computed(() => store.entities().filter((e) => e.status === 'Approved').length),
    rejectedCount: computed(() => store.entities().filter((e) => e.status === 'Rejected').length),
  })),

  // Methods: Actions that modify state
  withMethods((store, api = inject(EnrollmentService)) => ({
    // Load enrollments from API
    loadEnrollments: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        concatMap(() =>
          api.getAll().pipe(
            tap((rows) => {
              console.log('✅ Enrollments loaded:', rows.length);
              patchState(store, setAllEntities(rows), { isLoading: false });
            }),
            catchError((err) => {
              console.error('❌ Error loading enrollments:', err);

              // Log more details about the error
              if (err.status === 0) {
                console.error('⚠️ Network error - API might not be running or CORS issue');
                console.error('   - Is your API running? Run: dotnet run');
                console.error('   - Check CORS configuration in Program.cs');
              } else if (err.status === 404) {
                console.error('⚠️ Endpoint not found - Check the URL:', api['baseUrl']);
              } else if (err.status === 500) {
                console.error('⚠️ Server error - Check API logs');
              }

              patchState(store, {
                isLoading: false,
                error: `Failed to load enrollments: ${err.message || 'Unknown error'}`,
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    // Optimistic Approve: Update UI immediately, rollback if server fails
    approveEnrollment: rxMethod<string>(
      pipe(
        tap((id) => {
          // Optimistic update - UI reacts before network completes
          patchState(store, updateEntity({ id, changes: { status: 'Approved' } }));
        }),
        concatMap((id) =>
          api.approve(id).pipe(
            catchError((err) => {
              // Server rejected - rollback to Pending
              patchState(store, updateEntity({ id, changes: { status: 'Pending' } }));
              patchState(store, {
                error: 'Server rejected the approval. Check enrollment constraints.',
              });
              console.error('Error approving enrollment:', err);
              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    // Optimistic Reject
    rejectEnrollment: rxMethod<string>(
      pipe(
        tap((id) => {
          patchState(store, updateEntity({ id, changes: { status: 'Rejected' } }));
        }),
        concatMap((id) =>
          api.reject(id).pipe(
            catchError((err) => {
              patchState(store, updateEntity({ id, changes: { status: 'Pending' } }));
              patchState(store, {
                error: 'Server rejected the rejection. Check enrollment constraints.',
              });
              console.error('Error rejecting enrollment:', err);
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
  })),
);
