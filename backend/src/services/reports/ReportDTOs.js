/**
 * Data Transfer Objects for the Reports & Insights module.
 * These format the repository output into the exact JSON shape required by the client.
 */

export class ReportDTOs {
  static formatAttendanceSummary(repositoryResult) {
    return {
      workingDays: repositoryResult.workingDays,
      presentCount: repositoryResult.presentCount,
      absentCount: repositoryResult.absentCount,
      leaveCount: repositoryResult.leaveCount,
      attendancePercentage: repositoryResult.workingDays > 0 
        ? parseFloat(((repositoryResult.presentCount / repositoryResult.workingDays) * 100).toFixed(2)) 
        : null
    };
  }

  static formatAttendanceRanking(repositoryResult) {
    return repositoryResult.map(student => ({
      studentId: student.id,
      name: student.name,
      erpId: student.erpId,
      presentCount: Number(student.present_count || 0),
      attendancePercentage: parseFloat(Number(student.attendance_percentage || 0).toFixed(2))
    }));
  }
  
  static formatLowAttendance(repositoryResult) {
    return repositoryResult.map(student => ({
      studentId: student.id,
      name: student.name,
      erpId: student.erpId,
      attendancePercentage: parseFloat(Number(student.attendance_percentage || 0).toFixed(2))
    }));
  }

  static formatFeeCollectionSummary(repositoryResult) {
    const expected = Number(repositoryResult.expectedAmount || 0);
    const collected = Number(repositoryResult.collectedAmount || 0);
    const outstanding = Number(repositoryResult.outstandingAmount || 0);

    return {
      expectedAmount: expected,
      collectedAmount: collected,
      outstandingAmount: outstanding,
      collectionPercentage: expected > 0 ? parseFloat(((collected / expected) * 100).toFixed(2)) : null
    };
  }

  static formatPaymentMethods(repositoryResult) {
    return repositoryResult.map(item => ({
      method: item.paymentMode || 'Unknown',
      amount: Number(item._sum.amount || 0)
    }));
  }

  static formatFeeDefaulters(repositoryResult) {
    return repositoryResult.map(defaulter => ({
      invoiceId: defaulter.id,
      studentId: defaulter.studentId,
      studentName: defaulter.studentName,
      className: defaulter.className,
      sectionName: defaulter.sectionName,
      pendingAmount: Number(defaulter.pendingAmount || 0),
      dueDate: defaulter.dueDate,
      daysOverdue: defaulter.daysOverdue
    }));
  }
}
