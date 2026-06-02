import prisma from '../utils/db.js';

const getDashboardStats = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      // 1. Fetch core counts
      const [studentCount, teacherCount, classCount] = await Promise.all([
        prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true, isArchived: false } }),
        prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true, isArchived: false } }),
        prisma.class.count({ where: { schoolId } })
      ]);

      const isNewSchool = studentCount === 0 && teacherCount === 0 && classCount === 0;

      // Default empty structure if brand-new school
      if (isNewSchool) {
        return res.json({
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
        });
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
      const feeSummary = await prisma.feeRecord.groupBy({
        by: ['status'],
        where: { schoolId },
        _sum: { amount: true }
      });
      const feesCollected = feeSummary.find(f => f.status === 'PAID')?._sum?.amount || 0;
      const pendingFees = (feeSummary.find(f => f.status === 'PENDING')?._sum?.amount || 0) + (feeSummary.find(f => f.status === 'OVERDUE')?._sum?.amount || 0);
      const totalFees = feesCollected + pendingFees;
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
      const pendingFeeRecordsCount = await prisma.feeRecord.count({
        where: { schoolId, status: { in: ['PENDING', 'OVERDUE'] } }
      });

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
        const minStr = u.createdAt.toISOString().substring(0, 16); // e.g. "2026-06-01T10:15"
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
        feeCollectionRating = `✓ ₹${feesCollected.toLocaleString('en-IN')} collected (${collectionRate}%)`;
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
      // (a) Fetch raw activity data
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
        prisma.feeRecord.findMany({
          where: { schoolId, status: 'PAID' },
          select: { amount: true, paidAt: true, month: true, year: true, student: { select: { name: true, erpId: true } } },
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

      // Process users (Group by minute to detect import, else single addition)
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
          // It's a bulk import!
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
          // Individual additions
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

      // Process notices
      rawNotices.forEach((n, idx) => {
        const audience = n.targetRoles.length > 0 ? n.targetRoles.join(', ') : 'Everyone';
        mergedActivities.push({
          id: `notice-${idx}-${n.createdAt.getTime()}`,
          type: 'NOTICE_PUBLISHED',
          description: `Notice published for ${audience}: "${n.title}"`,
          timestamp: n.createdAt
        });
      });

      // Process payments
      rawPayments.forEach((p, idx) => {
        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        mergedActivities.push({
          id: `payment-${idx}-${p.paidAt.getTime()}`,
          type: 'FEE_PAID',
          description: `Fee payment of ₹${p.amount.toLocaleString('en-IN')} received from student ${p.student?.name} (${p.student?.erpId}) for ${monthNames[p.month]} ${p.year}`,
          timestamp: p.paidAt
        });
      });

      // Process attendance submissions (Group by class + section + date + minute of createdAt)
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

      // Sort chronological descending
      const sortedActivities = mergedActivities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 15);

      return res.json({
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
      });
    }

    if (role === 'STUDENT') {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);

      const [attendance, profile] = await Promise.all([
        prisma.attendance.findFirst({
          where: {
            studentId: req.user.userId,
            date: { gte: today, lt: nextDate }
          }
        }),
        prisma.studentProfile.findUnique({ where: { userId: req.user.userId } })
      ]);

      let pendingAssignments = 0;
      if (profile) {
        pendingAssignments = await prisma.assignment.count({
          where: {
            schoolId, // Fix 5: Enforce schoolId
            sectionId: profile.sectionId,
            dueDate: { gte: new Date() },
            submissions: { none: { studentId: req.user.userId } }
          }
        });
      }

      return res.json({ 
        attendanceStatus: attendance ? attendance.status : 'NOT_MARKED',
        pendingAssignments 
      });
    }

    res.json({});
  } catch (error) {
    next(error);
  }
};

export { getDashboardStats  };
