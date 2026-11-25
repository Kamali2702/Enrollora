
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CourseService } from '../course.service';
import { CourseResponse, SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  // Course data
  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  // Search
  searchText = signal('');
  private appliedSearch = signal('');
  courseStatusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  // Add and Edit course modal
  isEditModalOpen = signal(false);
  isLoadingCourse = signal(false);
  isSavingCourse = signal(false);
  editError = signal('');
  selectedCourseId = signal<number | null>(null);

  editCourseForm = new FormGroup({
    courseName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    duration: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    fees: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    capacity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  // Handle search input
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }

  // Search courses
  searchCourses(): void {
    this.appliedSearch.set(this.searchText().trim());
    this.pageNumber.set(1);
    this.loadCourses();
  }

  // Clear search
  clearSearch(): void {
    this.searchText.set('');
    this.appliedSearch.set('');
    this.pageNumber.set(1);
    this.loadCourses();
  }

  // Apply active/inactive course filter
  onCourseStatusChange(value: string): void {
    if (value !== 'all' && value !== 'active' && value !== 'inactive') {
      return;
    }

    this.courseStatusFilter.set(value);
    this.pageNumber.set(1);
    this.loadCourses();
  }
  // Load courses from backend
  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const search = this.appliedSearch();
    const status = this.courseStatusFilter();

    const filters = {
      ...(search ? { search } : {}),
      ...(status !== 'all' ? { isActive: status === 'active' } : {}),
    };

    this.courseService
      .getCourses(this.pageNumber(), this.pageSize(), filters)
      .subscribe({
        next: (response) => {
          this.courses.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.errorMessage.set('Unable to load courses.');
          this.isLoading.set(false);
        },
      });
  }

  // Open empty form to add a new course
  openAddCourse(): void {
    this.selectedCourseId.set(null);
    this.isEditModalOpen.set(true);
    this.isLoadingCourse.set(false);
    this.isSavingCourse.set(false);
    this.editError.set('');

    this.editCourseForm.reset({
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true,
    });
  }

  // Open edit form and retrieve complete course details
  openEditCourse(course: CourseResponse): void {
    this.selectedCourseId.set(course.courseId);
    this.isEditModalOpen.set(true);
    this.isLoadingCourse.set(true);
    this.isSavingCourse.set(false);
    this.editError.set('');

    this.editCourseForm.reset({
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true,
    });

    this.courseService.getCourseById(course.courseId).subscribe({
      next: (details) => {
        this.editCourseForm.patchValue({
          courseName: details.courseName,
          duration: details.duration,
          fees: details.fees,
          capacity: details.capacity,
          isActive: details.isActive,
        });
        this.isLoadingCourse.set(false);
      },
      error: (error) => {
        console.error('Error loading course details:', error);
        this.editError.set('Unable to load course details. Please try again.');
        this.isLoadingCourse.set(false);
      },
    });
  }

  // Close Add/Edit form
  closeEditCourse(): void {
    if (this.isSavingCourse()) {
      return;
    }

    this.isEditModalOpen.set(false);
    this.selectedCourseId.set(null);
    this.editError.set('');
    this.editCourseForm.reset();
  }

  // Create a new course or update an existing course
  saveCourse(): void {
    if (this.editCourseForm.invalid) {
      this.editCourseForm.markAllAsTouched();
      return;
    }

    const courseId = this.selectedCourseId();
    const isCreating = courseId === null;

    const request: SaveCourseRequest = this.editCourseForm.getRawValue();

    this.isSavingCourse.set(true);
    this.editError.set('');

    const saveRequest = isCreating
      ? this.courseService.createCourse(request)
      : this.courseService.updateCourse(courseId, request);

    saveRequest.subscribe({
      next: () => {
        this.isSavingCourse.set(false);
        this.isEditModalOpen.set(false);
        this.selectedCourseId.set(null);
        this.editCourseForm.reset();

        if (isCreating) {
          this.pageNumber.set(1);
        }

        this.loadCourses();
      },
      error: (error) => {
        console.error(
          isCreating ? 'Error creating course:' : 'Error updating course:',
          error
        );

        this.editError.set(
          error?.error?.message ||
            (isCreating
              ? 'Unable to create course. Please try again.'
              : 'Unable to update course. Please try again.')
        );

        this.isSavingCourse.set(false);
      },
    });
  }

  // Deactivate an active course
  deactivatingCourseId = signal<number | null>(null);

  deactivateCourse(course: CourseResponse): void {
    if (!course.isActive) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${course.courseName}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deactivatingCourseId.set(course.courseId);

    this.courseService.deactivateCourse(course.courseId).subscribe({
      next: () => {
        this.deactivatingCourseId.set(null);
        this.loadCourses();
      },
      error: (error) => {
        console.error('Error deactivating course:', error);

        this.errorMessage.set(
          error?.error?.message || 'Unable to deactivate course. Please try again.'
        );

        this.deactivatingCourseId.set(null);
      },
    });
  }
  // View complete course details
  isDetailsModalOpen = signal(false);
  isLoadingDetails = signal(false);
  detailsError = signal('');
  selectedCourseDetails = signal<CourseResponse | null>(null);

  viewCourseDetails(course: CourseResponse): void {
    this.isDetailsModalOpen.set(true);
    this.isLoadingDetails.set(true);
    this.detailsError.set('');
    this.selectedCourseDetails.set(null);

    this.courseService.getCourseById(course.courseId).subscribe({
      next: (details) => {
        this.selectedCourseDetails.set(details);
        this.isLoadingDetails.set(false);
      },
      error: (error) => {
        console.error('Error loading course details:', error);
        this.detailsError.set('Unable to load course details. Please try again.');
        this.isLoadingDetails.set(false);
      },
    });
  }

  closeCourseDetails(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedCourseDetails.set(null);
    this.detailsError.set('');
  }
  // Navigate to next page
  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  // Navigate to previous page
  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }
}



