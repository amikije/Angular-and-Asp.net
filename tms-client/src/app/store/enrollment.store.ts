import { computed, inject } from '@angular/core'; // ✅ Fixed import
import { signalStore, withComputed, withMethods, patchState, withState } from '@ngrx/signals';
import { withEntities, setAllEntities, updateEntity } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, concatMap, tap, catchError, EMPTY, switchMap } from 'rxjs';
import { EnrollmentService } from '../services/enrollment.service';
import { LiveSyncService } from '../services/live-sync.service';
import { Enrollment } from '../models/enrollment.model';

export const EnrollmentStore = signalStore(
  { providedIn: 'root' },

  withState({
    isLoading: false,
    error: null as string | null,
  }),

  withEntities<Enrollment>(),

  withComputed((store) => ({
    pendingCount: computed(() => store.entities().filter((e) => e.status === 'Pending').length),
    approvedCount: computed(() => store.entities().filter((e) => e.status === 'Approved').length),
    rejectedCount: computed(() => store.entities().filter((e) => e.status === 'Rejected').length),
  })),

  withMethods((store, api = inject(EnrollmentService), sync = inject(LiveSyncService)) => ({
    // Load enrollments
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
              patchState(store, {
                isLoading: false,
                error: 'Failed to load enrollments. Please try again.',
                ...setAllEntities([]),
              });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    // Listen for live updates from SignalR
    listenForLiveUpdates: rxMethod<void>(
      pipe(
        tap(() => sync.connect()),
        switchMap(() => sync.events$),
        tap((event) => {
          console.log('🔄 Applying live update:', event);
          patchState(
            store,
            updateEntity({
              id: event.id,
              changes: { status: event.status },
            }),
          );
        }),
      ),
    ),

    // Approve enrollment with optimistic update
    approveEnrollment: rxMethod<string>(
      pipe(
        tap((id) => {
          patchState(store, updateEntity({ id, changes: { status: 'Approved' } }));
        }),
        concatMap((id) =>
          api.approve(id).pipe(
            catchError((err) => {
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

    // Reject enrollment with optimistic update
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
