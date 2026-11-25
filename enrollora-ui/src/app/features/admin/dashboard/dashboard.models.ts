export interface RecentStudentRegistration {
  studentId: number;
  name: string;
  email: string;
  department: string;
  status: string;
  registeredAt: string;
}

export interface DashboardSummary {
  totalStudents: number;
  pendingApprovals: number;
  approvedStudents: number;
  rejectedStudents: number;
  totalCourses: number;
  activeCourses: number;
  activeEnrollments: number;
  cancelledEnrollments: number;
  pendingCancellationRequests: number;
  averageCgpa: number;
  totalAvailableSeats: number;
  recentStudentRegistrations: RecentStudentRegistration[];
}
