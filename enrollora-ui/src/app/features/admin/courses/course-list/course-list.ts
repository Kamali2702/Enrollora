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

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  // Edit course
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

  // Load courses from backend
  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const search = this.appliedSearch();
    const filters = search ? { search } : undefined;

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

  // Close edit form
  closeEditCourse(): void {
    if (this.isSavingCourse()) {
      return;
    }

    this.isEditModalOpen.set(false);
    this.selectedCourseId.set(null);
    this.editError.set('');
    this.editCourseForm.reset();
  }

  // Save updated course
  saveCourse(): void {
    if (this.editCourseForm.invalid) {
      this.editCourseForm.markAllAsTouched();
      return;
    }

    const courseId = this.selectedCourseId();

    if (courseId === null) {
      this.editError.set('No course selected.');
      return;
    }

    const request: SaveCourseRequest = this.editCourseForm.getRawValue();

    this.isSavingCourse.set(true);
    this.editError.set('');

    this.courseService.updateCourse(courseId, request).subscribe({
      next: () => {
        this.isSavingCourse.set(false);
        this.isEditModalOpen.set(false);
        this.selectedCourseId.set(null);
        this.loadCourses();
      },
      error: (error) => {
        console.error('Error updating course:', error);
        this.editError.set(
          error?.error?.message || 'Unable to update course. Please try again.'
        );
        this.isSavingCourse.set(false);
      },
    });
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
