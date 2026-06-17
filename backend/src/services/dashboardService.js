import prisma from '../utils/db.js';

class DashboardService {
  async getAdminDashboardStats(schoolId) {
    // 1. Fetch core counts
    const [studentCount, teacherCount, classCount] = await Promise.all([
      prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true, isArchived: false } }),
      prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true, isArchived: false } }),
      prisma.class.count({ where: { schoolId } })
    ]);

    const isNewSchool = studentCount === 0 && teacherCount === 0 && classCount === 0;

    // Default empty structure if brand-new school
    if (isNewSchool) {
      return {
        isNewSchool: true,
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
        attendanceTodayRate: 0,
        feesCollected: 0,
        pendingFees: 0,
        schoolHealth: {
          attendance: "Pending Marking",
          fees: "No Records",
          teacherActivity: "No Teachers Registered",
          pendingActionsCount: 0
        },
        actionCenter: {
          attendancePendingCount: 0,
          pendingFeeRecordsCount: 0,
          recentNoticesText: "No notices published yet",
          recentImportsText: "No recent data imports"
        },
        academicSnapshot: [],
        attendanceSnapshot: [],
        financialSnapshot: {
          feesCollected: 0,
          pendingFees: 0,
          collectionRate: 0
        },
        activities: []
      };
    }

    // 2. Fetch context dates for today (midnight bounds)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // 3. Compute today's attendance rate
    const attendanceToday = await prisma.attendance.findMany({
      where: {
        section: { class: { schoolId } },
        date: { gte: todayStart, lt: todayEnd }
      },
      select: { status: true }
    });
    const totalMarkedToday = attendanceToday.length;
    const presentToday = attendanceToday.filter(a => a.status === 'PRESENT').length;
    const leaveToday = attendanceToday.filter(a => a.status === 'LEAVE').length;
    const attendanceTodayRate = totalMarkedToday > 0 ? Math.round(((presentToday + leaveToday) / totalMarkedToday) * 100) : 0;

    // 4. Compute fee summary totals
    const [totalInvoicesAgg, totalPaymentsAgg] = await Promise.all([
      prisma.feeInvoice.aggregate({ where: { schoolId }, _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } })
    ]);
    const totalFees = totalInvoicesAgg._sum.totalAmount || 0;
    const feesCollected = totalPaymentsAgg._sum.amount || 0;
    const pendingFees = Math.max(0, totalFees - feesCollected);
    const collectionRate = totalFees > 0 ? Math.round((feesCollected / totalFees) * 100) : 0;

    // 5. Compute action items
    // (a) Active sections and today's marked section count
    const activeSections = await prisma.section.findMany({
      where: { class: { schoolId, isArchived: false }, isArchived: false },
      include: { class: true }
    });
    const markedSectionsToday = await prisma.attendance.groupBy({
      by: ['sectionId'],
      where: {
        section: { class: { schoolId } },
        date: { gte: todayStart, lt: todayEnd }
      }
    });
    const markedSectionIds = new Set(markedSectionsToday.map(s => s.sectionId).filter(Boolean));
    const attendancePendingCount = activeSections.filter(s => !markedSectionIds.has(s.id)).length;

    // (b) Pending student fees records count
    const allInvoicesForDashboard = await prisma.feeInvoice.findMany({
      where: { schoolId },
      include: { payments: true }
    });
    const pendingFeeRecordsCount = allInvoicesForDashboard.filter(i => {
      const paid = i.payments.reduce((sum, p) => sum + p.amount, 0);
      return paid < i.totalAmount;
    }).length;

    // (c) Recent notice summary info
    const recentNoticesList = await prisma.notice.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const noticesThisWeek = recentNoticesList.filter(n => n.createdAt >= sevenDaysAgo).length;
    let recentNoticesText = "No recent notices published";
    if (noticesThisWeek > 0) {
      recentNoticesText = `${noticesThisWeek} notice${noticesThisWeek > 1 ? 's' : ''} published this week`;
    } else if (recentNoticesList.length > 0) {
      recentNoticesText = `Latest: ${recentNoticesList[0].title}`;
    }

    // (d) Detect recent imports dynamically by checking if multiple students/teachers are created in same minute
    const recentUsersForImportCheck = await prisma.user.findMany({
      where: { schoolId, role: { in: ['STUDENT', 'TEACHER'] } },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const userGroups = {};
    recentUsersForImportCheck.forEach(u => {
      const minStr = u.createdAt.toISOString().substring(0, 16);
      if (!userGroups[minStr]) userGroups[minStr] = { STUDENTS: 0, TEACHERS: 0 };
      if (u.role === 'STUDENT') userGroups[minStr].STUDENTS++;
      if (u.role === 'TEACHER') userGroups[minStr].TEACHERS++;
    });
    let recentImportsText = "No recent data imports";
    const importTimes = Object.keys(userGroups).sort((a, b) => b.localeCompare(a));
    for (const timeStr of importTimes) {
      const group = userGroups[timeStr];
      if (group.STUDENTS >= 5 || group.TEACHERS >= 5) {
        const typeStr = group.STUDENTS >= 5 ? 'students' : 'teachers';
        const count = group.STUDENTS >= 5 ? group.STUDENTS : group.TEACHERS;
        const dateObj = new Date(timeStr + ":00Z");
        recentImportsText = `Imported ${count} ${typeStr} on ${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        break;
      }
    }

    // 6. Compute School Health Ratings
    let attendanceTodayRating = "Attendance pending today";
    if (totalMarkedToday > 0) {
      if (attendancePendingCount > 0) {
        attendanceTodayRating = `Pending: ${attendancePendingCount} class${attendancePendingCount > 1 ? 'es' : ''}`;
      } else {
        attendanceTodayRating = `✓ ${attendanceTodayRate}% attendance marked`;
      }
    }

    let feeCollectionRating = "No fee records yet";
    if (totalFees > 0) {
      feeCollectionRating = `✓ ₹${(feesCollected / 100).toLocaleString('en-IN')} collected (${collectionRate}%)`;
    }

    let teacherActivityRating = "No teachers registered";
    if (teacherCount > 0) {
      if (attendancePendingCount === 0) {
        teacherActivityRating = "✓ Teacher checklist complete";
      } else {
        teacherActivityRating = `${attendancePendingCount} class${attendancePendingCount > 1 ? 'es' : ''} awaiting marking`;
      }
    }

    const pendingActionsCount = attendancePendingCount + (pendingFeeRecordsCount > 0 ? 1 : 0);

    // 7. Academic Snapshot (Students per Class)
    const classesWithStudents = await prisma.class.findMany({
      where: { schoolId, isArchived: false },
      select: {
        name: true,
        sections: {
          where: { isArchived: false },
          select: {
            students: {
              where: { user: { isActive: true, isArchived: false } },
              select: { id: true }
            }
          }
        }
      }
    });
    const academicSnapshot = classesWithStudents
      .map(c => {
        const studentCount = c.sections.reduce((sum, s) => sum + s.students.length, 0);
        return {
          className: `Class ${c.name}`,
          studentCount
        };
      })
      .filter(c => c.studentCount > 0);

    // 8. Attendance Snapshot (Last 7 Days Trend)
    const attendanceSnapshot = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const dNext = new Date(d);
      dNext.setDate(dNext.getDate() + 1);
      
      const dayRecords = await prisma.attendance.findMany({
        where: {
          section: { class: { schoolId } },
          date: { gte: d, lt: dNext }
        },
        select: { status: true }
      });
      
      const total = dayRecords.length;
      const present = dayRecords.filter(r => r.status === 'PRESENT').length;
      const leave = dayRecords.filter(r => r.status === 'LEAVE').length;
      const rate = total > 0 ? Math.round(((present + leave) / total) * 100) : null;
      
      attendanceSnapshot.push({
        date: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        rate: rate
      });
    }

    // 9. unified Recent Activity Feed (Group bulk, list singular)
    const [rawUsers, rawNotices, rawPayments, rawAttendance] = await Promise.all([
      prisma.user.findMany({
        where: { schoolId, role: { in: ['STUDENT', 'TEACHER'] } },
        select: { name: true, role: true, erpId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.notice.findMany({
        where: { schoolId, isArchived: false },
        select: { title: true, targetRoles: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.payment.findMany({
        where: { schoolId },
        select: { status: true, amount: true, paidAt: true, invoice: { select: { month: true, year: true, student: { select: { name: true, erpId: true } } } } },
        orderBy: { paidAt: 'desc' },
        take: 15
      }),
      prisma.attendance.findMany({
        where: { section: { class: { schoolId } } },
        select: { createdAt: true, date: true, section: { select: { name: true, class: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 60
      })
    ]);

    const mergedActivities = [];

    const userMinuteGroups = {};
    rawUsers.forEach(u => {
      const minStr = u.createdAt.toISOString().substring(0, 16);
      if (!userMinuteGroups[minStr]) userMinuteGroups[minStr] = [];
      userMinuteGroups[minStr].push(u);
    });

    Object.keys(userMinuteGroups).forEach(minStr => {
      const usersInMin = userMinuteGroups[minStr];
      const timestamp = new Date(minStr + ":00Z");
      
      if (usersInMin.length >= 5) {
        const roleCounts = { STUDENT: 0, TEACHER: 0 };
        usersInMin.forEach(u => roleCounts[u.role]++);
        
        let desc = `Bulk import completed successfully: `;
        if (roleCounts.STUDENT > 0 && roleCounts.TEACHER > 0) {
          desc += `${roleCounts.STUDENT} students and ${roleCounts.TEACHER} teachers imported`;
        } else if (roleCounts.STUDENT > 0) {
          desc += `${roleCounts.STUDENT} students imported`;
        } else {
          desc += `${roleCounts.TEACHER} teachers imported`;
        }
        
        mergedActivities.push({
          id: `import-${minStr}`,
          type: 'IMPORT_COMPLETED',
          description: desc,
          timestamp
        });
      } else {
        usersInMin.forEach(u => {
          mergedActivities.push({
            id: `user-${u.erpId}`,
            type: u.role === 'STUDENT' ? 'STUDENT_ADDED' : 'TEACHER_ADDED',
            description: u.role === 'STUDENT' 
              ? `New student added: ${u.name} (${u.erpId})` 
              : `New teacher added: ${u.name} (${u.erpId})`,
            timestamp: u.createdAt
          });
        });
      }
    });

    rawNotices.forEach((n, idx) => {
      const audience = n.targetRoles.length > 0 ? n.targetRoles.join(', ') : 'Everyone';
      mergedActivities.push({
        id: `notice-${idx}-${n.createdAt.getTime()}`,
        type: 'NOTICE_PUBLISHED',
        description: `Notice published for ${audience}: "${n.title}"`,
        timestamp: n.createdAt
      });
    });

    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    rawPayments.forEach((p, idx) => {
      let desc = `Fee payment of ₹${(p.amount / 100).toLocaleString('en-IN')} received from student ${p.invoice?.student?.name} (${p.invoice?.student?.erpId}) for ${monthNames[p.invoice?.month]} ${p.invoice?.year}`;
      let activityType = 'FEE_PAID';

      if (p.status === 'PENDING_VERIFICATION') {
        desc = `Fee payment of ₹${(p.amount / 100).toLocaleString('en-IN')} verification pending from student ${p.invoice?.student?.name} (${p.invoice?.student?.erpId}) for ${monthNames[p.invoice?.month]} ${p.invoice?.year}`;
        activityType = 'PAYMENT_PENDING';
      } else if (p.status === 'REJECTED') {
        desc = `Fee payment of ₹${(p.amount / 100).toLocaleString('en-IN')} rejected from student ${p.invoice?.student?.name} (${p.invoice?.student?.erpId}) for ${monthNames[p.invoice?.month]} ${p.invoice?.year}`;
        activityType = 'PAYMENT_REJECTED';
      }

      mergedActivities.push({
        id: `payment-${idx}-${p.paidAt.getTime()}`,
        type: activityType,
        description: desc,
        timestamp: p.paidAt
      });
    });

    const attendanceGroups = {};
    rawAttendance.forEach(a => {
      const className = a.section?.class?.name || 'Unknown';
      const sectionName = a.section?.name || '';
      const classSectionStr = sectionName ? `${className}-${sectionName}` : className;
      const dateStr = a.date.toISOString().substring(0, 10);
      const minStr = a.createdAt.toISOString().substring(0, 16);
      const groupKey = `${classSectionStr}_${dateStr}_${minStr}`;
      
      if (!attendanceGroups[groupKey]) {
        attendanceGroups[groupKey] = {
          classSection: classSectionStr,
          date: a.date,
          createdAt: a.createdAt,
          count: 0
        };
      }
      attendanceGroups[groupKey].count++;
    });

    Object.keys(attendanceGroups).forEach(key => {
      const group = attendanceGroups[key];
      const dateFormatted = new Date(group.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
      mergedActivities.push({
        id: `attendance-${key}`,
        type: 'ATTENDANCE_SUBMITTED',
        description: `Attendance submitted for Class ${group.classSection} on ${dateFormatted} (${group.count} students marked)`,
        timestamp: group.createdAt
      });
    });

    const sortedActivities = mergedActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15);

    return {
      isNewSchool: false,
      studentCount,
      teacherCount,
      classCount,
      attendanceTodayRate,
      feesCollected,
      pendingFees,
      schoolHealth: {
        attendance: attendanceTodayRating,
        fees: feeCollectionRating,
        teacherActivity: teacherActivityRating,
        pendingActionsCount
      },
      actionCenter: {
        attendancePendingCount,
        pendingFeeRecordsCount,
        recentNoticesText,
        recentImportsText
      },
      academicSnapshot,
      attendanceSnapshot,
      financialSnapshot: {
        feesCollected,
        pendingFees,
        collectionRate
      },
      activities: sortedActivities
    };
  }

  async getStudentDashboardStats(userId, schoolId) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1);

    const [attendance, profile] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          studentId: userId,
          date: { gte: today, lt: nextDate }
        }
      }),
      prisma.studentProfile.findUnique({ where: { userId } })
    ]);

    let pendingAssignments = 0;
    if (profile) {
      pendingAssignments = await prisma.assignment.count({
        where: {
          schoolId,
          sectionId: profile.sectionId,
          dueDate: { gte: new Date() },
          submissions: { none: { studentId: userId } }
        }
      });
    }

    return { 
      attendanceStatus: attendance ? attendance.status : 'NOT_MARKED',
      pendingAssignments 
    };
  }

  async getAccountsDashboardStats(schoolId) {
    // 1. Base dates
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Aggregate Totals
    const [allInvoices, totalPaymentsAgg, paymentsThisMonth, paymentsToday] = await Promise.all([
      prisma.feeInvoice.findMany({
        where: { schoolId },
        include: { payments: true }
      }),
      prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
      prisma.payment.findMany({
        where: { schoolId, paidAt: { gte: monthStart, lte: monthEnd } },
        select: { amount: true, paidAt: true }
      }),
      prisma.payment.count({
        where: { schoolId, paidAt: { gte: todayStart, lt: todayEnd } }
      })
    ]);

    const totalCollected = totalPaymentsAgg._sum.amount || 0;
    
    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let invoicesDueTodayCount = 0;
    
    const pendingInvoicesData = [];

    for (const inv of allInvoices) {
      totalInvoiced += inv.totalAmount;
      const paidForInv = inv.payments.reduce((acc, p) => acc + p.amount, 0);
      const outstandingForInv = Math.max(0, inv.totalAmount - paidForInv);
      
      if (outstandingForInv > 0) {
        totalOutstanding += outstandingForInv;
        
        const isOverdue = inv.dueDate && inv.dueDate < todayStart;
        if (isOverdue) {
          totalOverdue += outstandingForInv;
          overdueCount++;
        }

        const isDueToday = inv.dueDate && inv.dueDate >= todayStart && inv.dueDate < todayEnd;
        if (isDueToday) {
          invoicesDueTodayCount++;
        }

        pendingInvoicesData.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          studentId: inv.studentId,
          totalAmount: inv.totalAmount,
          paidAmount: paidForInv,
          outstandingAmount: outstandingForInv,
          dueDate: inv.dueDate,
          isOverdue
        });
      }
    }

    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // 3. Collection Health Rules
    let collectionRateStatus = 'Healthy';
    if (collectionRate < 60) collectionRateStatus = 'Critical';
    else if (collectionRate <= 80) collectionRateStatus = 'Needs Attention';

    let outstandingInvoicesStatus = 'Healthy';
    if (overdueCount > 50) outstandingInvoicesStatus = 'Critical';
    else if (overdueCount > 10) outstandingInvoicesStatus = 'Needs Attention';

    let recentActivityStatus = paymentsThisMonth.length > 0 ? 'Active' : 'Quiet';

    // 4. Pending Invoices (Top 5 largest outstanding)
    const sortedPendingInvoices = pendingInvoicesData.sort((a, b) => b.outstandingAmount - a.outstandingAmount).slice(0, 5);
    
    // Fetch student info for these 5
    const pendingInvoices = await Promise.all(sortedPendingInvoices.map(async (inv) => {
      const student = await prisma.user.findUnique({
        where: { id: inv.studentId },
        select: { name: true, erpId: true }
      });
      return { ...inv, studentName: student?.name, erpId: student?.erpId };
    }));

    // 5. Activity Feed
    const [rawPayments, rawInvoices, rawFeeStructures] = await Promise.all([
      prisma.payment.findMany({
        where: { schoolId },
        select: { status: true, amount: true, paidAt: true, invoice: { select: { invoiceNumber: true, student: { select: { name: true } } } } },
        orderBy: { paidAt: 'desc' },
        take: 15
      }),
      prisma.feeInvoice.findMany({
        where: { schoolId },
        select: { invoiceNumber: true, createdAt: true, student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15
      }),
      prisma.feeStructure.findMany({
        where: { schoolId },
        select: { name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const mergedActivities = [];
    rawPayments.forEach(p => {
      let desc = `Payment of ₹${(p.amount / 100).toLocaleString('en-IN')} received for invoice ${p.invoice?.invoiceNumber} (${p.invoice?.student?.name})`;
      let activityType = 'PAYMENT_RECEIVED';

      if (p.status === 'PENDING_VERIFICATION') {
        desc = `Payment of ₹${(p.amount / 100).toLocaleString('en-IN')} verification pending for invoice ${p.invoice?.invoiceNumber} (${p.invoice?.student?.name})`;
        activityType = 'PAYMENT_PENDING';
      } else if (p.status === 'REJECTED') {
        desc = `Payment of ₹${(p.amount / 100).toLocaleString('en-IN')} rejected for invoice ${p.invoice?.invoiceNumber} (${p.invoice?.student?.name})`;
        activityType = 'PAYMENT_REJECTED';
      }

      mergedActivities.push({
        id: `payment-${p.paidAt.getTime()}`,
        type: activityType,
        description: desc,
        timestamp: p.paidAt
      });
    });

    rawInvoices.forEach(i => {
      mergedActivities.push({
        id: `invoice-${i.createdAt.getTime()}`,
        type: 'INVOICE_GENERATED',
        description: `Invoice ${i.invoiceNumber} generated for ${i.student?.name}`,
        timestamp: i.createdAt
      });
    });

    rawFeeStructures.forEach(fs => {
      mergedActivities.push({
        id: `feestructure-${fs.createdAt.getTime()}`,
        type: 'FEE_STRUCTURE_CREATED',
        description: `Fee structure "${fs.name}" was created`,
        timestamp: fs.createdAt
      });
    });

    const recentActivity = mergedActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);

    // 6. Notices
    const notices = await prisma.notice.findMany({
      where: { 
        schoolId, 
        isArchived: false,
        OR: [
          { targetRoles: { hasSome: ['ACCOUNTS'] } },
          { targetRoles: { isEmpty: true } } // effectively everyone
        ]
      },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    // 7. This Month Collection Trend (Weekly breakdown)
    const weeks = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 };
    paymentsThisMonth.forEach(p => {
      const date = p.paidAt.getDate();
      if (date <= 7) weeks["Week 1"] += p.amount;
      else if (date <= 14) weeks["Week 2"] += p.amount;
      else if (date <= 21) weeks["Week 3"] += p.amount;
      else weeks["Week 4"] += p.amount;
    });

    const collectionTrend = Object.keys(weeks).map(week => ({
      name: week,
      amount: weeks[week]
    }));

    return {
      kpis: {
        totalCollected,
        totalOutstanding,
        overdueCount,
        paymentsThisMonthCount: paymentsThisMonth.length
      },
      health: {
        collectionRateStatus,
        collectionRate,
        outstandingInvoicesStatus,
        recentActivityStatus
      },
      priorities: {
        overdueInvoices: overdueCount,
        invoicesDueToday: invoicesDueTodayCount,
        paymentsReceivedToday: paymentsToday
      },
      pendingInvoices,
      recentActivity,
      notices,
      collectionSnapshot: {
        paidAmount: totalCollected,
        outstandingAmount: totalOutstanding - totalOverdue,
        overdueAmount: totalOverdue
      },
      collectionTrend
    };
  }
}

export default new DashboardService();
