import prisma from '../src/utils/db.js';

async function main() {
  console.log('Starting Phase A Migration...');
  
  // 1. Create default Academic Year dynamically for each school
  const currentYear = new Date().getFullYear();
  const nextYear = (currentYear + 1).toString().slice(2);
  const academicYearName = `${currentYear}-${nextYear}`;
  const startDate = new Date(`${currentYear}-04-01T00:00:00Z`);
  const endDate = new Date(`${currentYear + 1}-03-31T23:59:59Z`);

  const schools = await prisma.school.findMany();
  for (const school of schools) {
    let activeYear = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, name: academicYearName }
    });

    if (!activeYear) {
      activeYear = await prisma.academicYear.create({
        data: {
          schoolId: school.id,
          name: academicYearName,
          startDate,
          endDate,
          isCurrent: true
        }
      });
      console.log(`Created AcademicYear ${academicYearName} for school ${school.name}`);
    } else {
      console.log(`AcademicYear ${academicYearName} already exists for school ${school.name}`);
    }
  }

  // Helper function to get default section for a class
  const classDefaultSectionMap = {};
  async function getDefaultSection(classId) {
    if (classDefaultSectionMap[classId]) return classDefaultSectionMap[classId];

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { sections: true }
    });

    if (!cls) return null;

    let defaultSection;
    if (cls.sections.length === 0) {
      defaultSection = await prisma.section.create({
        data: {
          classId: cls.id,
          name: cls.name // Name it after the class
        }
      });
      console.log(`Created default section for Class ${cls.name}`);
    } else {
      defaultSection = cls.sections[0];
    }
    
    classDefaultSectionMap[classId] = defaultSection;
    return defaultSection;
  }

  // 2. Migrate StudentProfile sectionId
  const studentsWithoutSection = await prisma.studentProfile.findMany({
    where: { sectionId: null }
  });
  console.log(`Found ${studentsWithoutSection.length} students without section.`);
  for (const student of studentsWithoutSection) {
    const section = await getDefaultSection(student.classId);
    if (section) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { sectionId: section.id }
      });
    }
  }

  // 3. Migrate Attendance sectionId
  const attendancesWithoutSection = await prisma.attendance.findMany({
    where: { sectionId: null }
  });
  console.log(`Found ${attendancesWithoutSection.length} attendance records without section.`);
  for (const att of attendancesWithoutSection) {
    const section = await getDefaultSection(att.classId);
    if (section) {
      await prisma.attendance.update({
        where: { id: att.id },
        data: { sectionId: section.id }
      });
    }
  }

  // 4. Migrate Assignment sectionId
  const assignmentsWithoutSection = await prisma.assignment.findMany({
    where: { sectionId: null }
  });
  console.log(`Found ${assignmentsWithoutSection.length} assignments without section.`);
  for (const assignment of assignmentsWithoutSection) {
    const section = await getDefaultSection(assignment.classId);
    if (section) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { sectionId: section.id }
      });
    }
  }

  // 5. Migrate TimeTableEntry sectionId
  const timetablesWithoutSection = await prisma.timeTableEntry.findMany({
    where: { sectionId: null }
  });
  console.log(`Found ${timetablesWithoutSection.length} timetable entries without section.`);
  for (const tte of timetablesWithoutSection) {
    const section = await getDefaultSection(tte.classId);
    if (section) {
      await prisma.timeTableEntry.update({
        where: { id: tte.id },
        data: { sectionId: section.id }
      });
    }
  }

  // 6. Migrate TeacherProfile.assignedSections into TeacherAssignment
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      assignedSections: true,
      user: true
    }
  });

  let migratedAssignments = 0;
  for (const teacher of teachers) {
    if (!teacher.user.schoolId) continue;

    // Get the current academic year for the school
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: teacher.user.schoolId, isCurrent: true }
    });

    if (!currentAcademicYear) {
      console.warn(`No current academic year found for school ${teacher.user.schoolId}`);
      continue;
    }

    for (const section of teacher.assignedSections) {
      // Check if assignment already exists
      const existing = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          sectionId: section.id,
          academicYearId: currentAcademicYear.id
        }
      });

      if (!existing) {
        await prisma.teacherAssignment.create({
          data: {
            teacherId: teacher.id,
            sectionId: section.id,
            academicYearId: currentAcademicYear.id,
            // subjectId remains null for class teacher
          }
        });
        migratedAssignments++;
      }
    }
  }
  console.log(`Migrated ${migratedAssignments} TeacherAssignments.`);

  console.log('Migration Phase A completed.');
}

main()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
