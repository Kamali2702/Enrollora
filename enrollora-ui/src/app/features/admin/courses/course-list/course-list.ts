
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CourseService } from '../course.service';
import { CourseResponse } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule],
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
