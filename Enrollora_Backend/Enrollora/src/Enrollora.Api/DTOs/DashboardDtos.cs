namespace Enrollora.Api.DTOs;

public sealed record RecentStudentRegistration(
    int StudentId,
    string Name,
    string Email,
    string Department,
    string Status,
    DateTime RegisteredAt);

public sealed record DashboardSummary(
    int TotalStudents,
    int PendingApprovals,
    int ApprovedStudents,
    int RejectedStudents,
    int TotalCourses,
    int ActiveCourses,
    int ActiveEnrollments,
    int CancelledEnrollments,
    int PendingCancellationRequests,
    decimal AverageCgpa,
    int TotalAvailableSeats,
    IReadOnlyList<RecentStudentRegistration> RecentStudentRegistrations);
