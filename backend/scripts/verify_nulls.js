import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const studentNulls = await prisma.$queryRaw`SELECT COUNT(*) FROM "StudentProfile" WHERE "sectionId" IS NULL;`;
    const attendanceNulls = await prisma.$queryRaw`SELECT COUNT(*) FROM "Attendance" WHERE "sectionId" IS NULL;`;
    const assignmentNulls = await prisma.$queryRaw`SELECT COUNT(*) FROM "Assignment" WHERE "sectionId" IS NULL;`;
    const timetableNulls = await prisma.$queryRaw`SELECT COUNT(*) FROM "TimeTableEntry" WHERE "sectionId" IS NULL;`;

    console.log("StudentProfile null sectionId:", Number(studentNulls[0].count));
    console.log("Attendance null sectionId:", Number(attendanceNulls[0].count));
    console.log("Assignment null sectionId:", Number(assignmentNulls[0].count));
    console.log("TimeTableEntry null sectionId:", Number(timetableNulls[0].count));

    if (
      Number(studentNulls[0].count) === 0 &&
      Number(attendanceNulls[0].count) === 0 &&
      Number(assignmentNulls[0].count) === 0 &&
      Number(timetableNulls[0].count) === 0
    ) {
      console.log("SUCCESS: No null sectionIds found.");
    } else {
      console.error("FAILURE: Found null sectionIds.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
