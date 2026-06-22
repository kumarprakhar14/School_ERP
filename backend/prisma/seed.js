import prisma from '../src/utils/db.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Starting seed...');

  await prisma.timeTableEntry?.deleteMany().catch(()=>{});
  await prisma.assignmentSubmission?.deleteMany().catch(()=>{});
  await prisma.assignment?.deleteMany().catch(()=>{});
  await prisma.paymentTransaction?.deleteMany().catch(()=>{});
  await prisma.paymentOrder?.deleteMany().catch(()=>{});
  await prisma.attendance?.deleteMany().catch(()=>{});
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

  // Clear Subscription models
  await prisma.globalFeatureFlag?.deleteMany().catch(()=>{});
  await prisma.schoolFeatureOverride?.deleteMany().catch(()=>{});
  await prisma.schoolSubscription?.deleteMany().catch(()=>{});
  await prisma.planFeature?.deleteMany().catch(()=>{});
  await prisma.feature?.deleteMany().catch(()=>{});
  await prisma.planPricing?.deleteMany().catch(()=>{});
  await prisma.subscriptionPlan?.deleteMany().catch(()=>{});

  const passwordHash = await bcrypt.hash('password123', 10);

  // SUPER ADMIN
  await prisma.user.create({
    data: { erpId: 'SA001', passwordHash, role: 'SUPER_ADMIN', name: 'Super Admin' },
  });

  const school = await prisma.school.create({
    data: {
      name: 'Demo International School',
      code: '660',
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      settings: { create: { themeColor: '#3b82f6', description: 'A place for demo learning' } },
    },
  });

  // ADMIN
  await prisma.user.create({ data: { schoolId: school.id, erpId: '660001', passwordHash, role: 'ADMIN', name: 'School Admin' } });

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

  // SUBSCRIPTION PLANS
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      name: 'Free',
      description: 'Basic features for small schools.',
      badge: 'Starter',
      isDefault: true,
      displayOrder: 1,
      pricing: {
        create: [
          { interval: 'MONTHLY', price: 0 },
          { interval: 'YEARLY', price: 0 }
        ]
      }
    }
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: 'Starter',
      description: 'Essential modules for growing schools.',
      badge: 'Popular',
      displayOrder: 2,
      pricing: {
        create: [
          { interval: 'MONTHLY', price: 999 },
          { interval: 'YEARLY', price: 9999 }
        ]
      }
    }
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: 'Growth',
      description: 'Advanced modules and analytics.',
      displayOrder: 3,
      pricing: {
        create: [
          { interval: 'MONTHLY', price: 1999 },
          { interval: 'YEARLY', price: 19999 }
        ]
      }
    }
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: 'Enterprise',
      description: 'All features, custom limits, priority support.',
      badge: 'Best Value',
      isPublic: false,
      displayOrder: 4,
      pricing: {
        create: [
          { interval: 'MONTHLY', price: 4999 },
          { interval: 'YEARLY', price: 49999 }
        ]
      }
    }
  });

  console.log('Seed completed successfully! Generated dummy users, schools, and subscription plans.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
