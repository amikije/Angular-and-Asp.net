import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, patchState, withState } from '@ngrx/signals';
import { withEntities, setAllEntities, removeEntity, addEntity } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, concatMap, tap, catchError, EMPTY } from 'rxjs';
import { CourseService } from '../services/course.service';
import { Course } from '../models/course.model';

export const CourseStore = signalStore(
  { providedIn: 'root' },

  withState({
    isLoading: false,
    error: null as string | null,
  }),

  withEntities<Course>(),

  withComputed((store) => ({
    courseCount: computed(() => store.entities().length),
  })),

  withMethods((store, svc = inject(CourseService)) => ({
    // Load courses
    loadCourses: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        concatMap(() =>
          svc.getAll().pipe(
            tap((rows) => {
              console.log('✅ Courses loaded:', rows.length);
              patchState(store, setAllEntities(rows), { isLoading: false });
            }),
            catchError((err) => {
              console.error('❌ Error loading courses:', err);
              patchState(store, {
                isLoading: false,
                error: 'Failed to load courses. Please try again.',
              });
              patchState(store, setAllEntities<Course>([]));
              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    // ✅ Optimistic Delete with Rollback
    deleteCourse(id: number) {
      // 1. Take snapshot BEFORE mutating local state
      const previousSnapshot = store.entities();
      const courseToDelete = previousSnapshot.find((c) => c.id === id);

      if (!courseToDelete) {
        console.warn('⚠️ Course not found:', id);
        return;
      }

      console.log(`🗑️ Optimistically deleting course: ${courseToDelete.title}`);

      // 2. Instant visual feedback - remove entity immediately
      patchState(store, removeEntity(id));

      // 3. Dispatch API call to backend
      svc
        .delete(id)
        .pipe(
          catchError((err) => {
            // 4. Server rejected request - restore previous snapshot
            console.error(`❌ Delete failed for course ${id}:`, err);

            // Restore the entity
            patchState(store, addEntity(courseToDelete));

            // Set error message
            patchState(store, {
              error: err.error?.detail || 'Cannot delete course: active student enrollments exist.',
            });

            // Log the error
            console.error('💥 Delete error:', err.error?.detail || err.message);

            return EMPTY;
          }),
        )
        .subscribe({
          next: () => {
            console.log(`✅ Course ${courseToDelete.title} deleted successfully`);
            patchState(store, { error: null });
          },
          error: (err) => {
            // This is handled by catchError above
          },
        });
    },

    // Add course
    addCourse(course: Course) {
      patchState(store, addEntity(course));
    },
  })),
);
