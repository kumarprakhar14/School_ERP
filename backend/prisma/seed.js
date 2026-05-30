const prisma = require('../src/utils/db.js');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Starting seed...');

  await prisma.timeTableEntry?.deleteMany().catch(()=>{});
  await prisma.assignmentSubmission?.deleteMany().catch(()=>{});
  await prisma.assignment?.deleteMany().catch(()=>{});
  await prisma.attendance?.deleteMany().catch(()=>{});
  await prisma.feeRecord?.deleteMany().catch(()=>{});
  await prisma.notice?.deleteMany().catch(()=>{});
  await prisma.subject?.deleteMany().catch(()=>{});
  await prisma.period?.deleteMany().catch(()=>{});
  await prisma.studentProfile?.deleteMany().catch(()=>{});
  await prisma.teacherProfile?.deleteMany().catch(()=>{});
  await prisma.user?.deleteMany().catch(()=>{});
  await prisma.section?.deleteMany().catch(()=>{});
  await prisma.class?.deleteMany().catch(()=>{});
  await prisma.schoolSettings?.deleteMany().catch(()=>{});
  await prisma.school?.deleteMany().catch(()=>{});

  const passwordHash = await bcrypt.hash('password123', 10);

  // SUPER ADMIN
  await prisma.user.create({
    data: { erpId: 'SA001', passwordHash, role: 'SUPER_ADMIN', name: 'Super Admin' },
  });

  const school = await prisma.school.create({
    data: {
      name: 'Demo International School',
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      settings: { create: { themeColor: '#3b82f6', description: 'A place for demo learning' } },
    },
  });

  // ADMIN
  await prisma.user.create({ data: { schoolId: school.id, erpId: 'ADM001', passwordHash, role: 'ADMIN', name: 'School Admin' } });

  // // ACCOUNTS
  // for(let i=1; i<=5; i++) {
  //   await prisma.user.create({ data: { schoolId: school.id, erpId: `ACC00${i}`, passwordHash, role: 'ACCOUNTS', name: `Accounts ${i}` } });
  // }

  // // ACADEMICS
  // const class10 = await prisma.class.create({ data: { schoolId: school.id, name: '10' } });
  // const sectionA = await prisma.section.create({ data: { classId: class10.id, name: 'A' } });

  // // TEACHERS
  // for(let i=1; i<=5; i++) {
  //   await prisma.user.create({
  //     data: {
  //       schoolId: school.id, erpId: `TCH00${i}`, passwordHash, role: 'TEACHER', name: `Teacher ${i}`,
  //       teacherProfile: { create: { designation: 'Teacher', assignedSections: { connect: [{ id: sectionA.id }] } } },
  //     },
  //   });
  // }

  // // STUDENTS
  // for(let i=1; i<=5; i++) {
  //   await prisma.user.create({
  //     data: {
  //       schoolId: school.id, erpId: `STU00${i}`, passwordHash, role: 'STUDENT', name: `Student ${i}`,
  //       studentProfile: { create: { sectionId: sectionA.id, admissionDate: new Date() } },
  //     },
  //   });
  // }

  // console.log('Seed completed successfully! Generated 5-6 dummy users for each role.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
