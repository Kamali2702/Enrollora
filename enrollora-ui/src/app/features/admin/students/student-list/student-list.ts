
import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { StudentService } from '../student.service';
import {
  StudentResponse,
  StudentFilter,
  UpdateStudentRequest,
  CreateStudentRequest,
} from '../student.models';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentList implements OnInit {
  private studentService = inject(StudentService);
  private cdr = inject(ChangeDetectorRef);

  // Signals: student list, loading state, and error state
  students = signal<StudentResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination
  pageNumber = 1;
  pageSize = 5;
  totalRecords = 0;
  totalPages = 0;

  // Student details modal
  selectedStudent: StudentResponse | null = null;
  isDetailsLoading = false;
  detailsError = '';

  // Search and filter values
  filters: StudentFilter = {
    search: '',
    status: null,
    department: '',
    minAge: null,
    maxAge: null,
    minCgpa: null,
    maxCgpa: null,
  };

  ngOnInit(): void {
    this.loadStudents();
  }

  // Load students from the backend
  loadStudents(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentService
      .getStudents(this.pageNumber, this.pageSize, this.filters)
      .subscribe({
        next: (response) => {
          this.students.set(response.items);
          this.totalRecords = response.totalRecords;
          this.totalPages = response.totalPages;
          this.pageNumber = response.pageNumber;
          this.pageSize = response.pageSize;

          this.isLoading.set(false);
          this.cdr.markForCheck();
        },

        error: (error) => {
          console.error('Failed to load students:', error);

          this.errorMessage.set('Unable to load students.');
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  // Approve a student
  approveStudent(id: number): void {
    if (!confirm('Are you sure you want to approve this student?')) {
      return;
    }

    this.studentService.approveStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to approve student.');
      },
    });
  }

  // Reject a student
  rejectStudent(id: number): void {
    if (!confirm('Are you sure you want to reject this student?')) {
      return;
    }

    this.studentService.rejectStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to reject student.');
      },
    });
  }

  // Go to previous page
  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadStudents();
    }
  }

  // Go to next page
  goToNextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadStudents();
    }
  }

  // Change number of students displayed per page
  changePageSize(size: string): void {
    this.pageSize = Number(size);
    this.pageNumber = 1;
    this.loadStudents();
  }

  // Apply search and filters
  applyFilters(): void {
    this.pageNumber = 1;
    this.loadStudents();
  }

  // Clear all filters
  clearFilters(): void {
    this.filters = {
      search: '',
      status: null,
      department: '',
      minAge: null,
      maxAge: null,
      minCgpa: null,
      maxCgpa: null,
    };

    this.pageNumber = 1;
    this.loadStudents();
  }

  // View student details
  viewStudent(id: number): void {
    this.selectedStudent = null;
    this.isDetailsLoading = true;
    this.detailsError = '';

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.selectedStudent = student;
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details:', error);
        this.detailsError = 'Unable to load student details.';
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Add student modal
  isAddModalOpen = false;
  showCreateStudentPassword = false;
  isCreatingStudent = false;
  createStudentError = '';

  createStudentForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
    ]),
    department: new FormControl('', Validators.required),
    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60),
    ]),
    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
  });

  openAddStudentModal(): void {
    this.createStudentError = '';
    this.isAddModalOpen = true;
  }

  closeAddStudentModal(): void {
    this.isAddModalOpen = false;
    this.isCreatingStudent = false;
    this.createStudentError = '';

    this.createStudentForm.reset({
      name: '',
      email: '',
      password: '',
      department: '',
      age: 18,
      cgpa: 0,
    });
  }

  createStudent(): void {
    if (this.createStudentForm.invalid || this.isCreatingStudent) {
      this.createStudentForm.markAllAsTouched();
      return;
    }

    const formValue = this.createStudentForm.getRawValue();

    const studentData: CreateStudentRequest = {
      name: formValue.name!.trim(),
      email: formValue.email!.trim(),
      password: formValue.password!,
      department: formValue.department!.trim(),
      age: formValue.age!,
      cgpa: formValue.cgpa!,
    };

    this.isCreatingStudent = true;
    this.createStudentError = '';

    this.studentService.createStudent(studentData).subscribe({
      next: (student) => {
        this.isCreatingStudent = false;
        alert(`${student.name} added successfully. Status: Approved.`);
        this.closeAddStudentModal();
        this.pageNumber = 1;
        this.loadStudents();
      },
      error: (error) => {
        console.error('Failed to add student:', error);

        this.isCreatingStudent = false;
        this.createStudentError =
          error.error?.message ??
          error.error?.title ??
          'Unable to add student. Please check the details and email address.';

        this.cdr.markForCheck();
      },
    });
  }
  // Edit student modal
  isEditModalOpen = false;
  editingStudentId: number | null = null;

  studentForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    department: new FormControl('', Validators.required),
    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60),
    ]),
    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
  });

  // Load student details into the edit form
  editStudent(id: number): void {
    this.editingStudentId = id;
    this.isEditModalOpen = true;

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.studentForm.patchValue({
          name: student.name,
          email: student.email,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,
        });

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details', error);
      },
    });
  }

  // Close edit modal and reset form
  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentId = null;

    this.studentForm.reset({
      name: '',
      email: '',
      department: '',
      age: 18,
      cgpa: 0,
    });
  }

  // Update student
  updateStudent(): void {
    if (this.studentForm.invalid || this.editingStudentId === null) {
      return;
    }

    const formValue = this.studentForm.getRawValue();

    const studentData: UpdateStudentRequest = {
      name: formValue.name!,
      email: formValue.email!,
      department: formValue.department!,
      age: formValue.age!,
      cgpa: formValue.cgpa!,
    };

    this.studentService
      .updateStudent(this.editingStudentId, studentData)
      .subscribe({
        next: (updatedStudent) => {
          console.log('Student updated:', updatedStudent);

          this.closeEditModal();
          this.loadStudents();
        },
        error: (error) => {
          console.error('Failed to update student:', error);
        },
      });
  }

  // Delete student
  deleteStudent(id: number): void {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Failed to delete student:', error);
      },
    });
  }

  // Export all students matching the current filters
  isExporting = false;

  exportStudents(): void {
    if (this.isExporting) {
      return;
    }

    this.isExporting = true;
    this.cdr.markForCheck();

    this.studentService.exportStudents(this.filters).subscribe({
      next: (file) => {
        const url = window.URL.createObjectURL(file);
        const link = document.createElement('a');

        link.href = url;
        link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

        this.isExporting = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to export students:', error);

        this.isExporting = false;
        this.cdr.markForCheck();

        alert('Unable to export student records. Please try again.');
      },
    });
  }
}

