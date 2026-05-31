
const prisma = require('./src/utils/db');

async function test() {
  try {
    const users = await prisma.user.findMany({
      where: { erpId: 'NaN' }
    });
    console.log('Users with NaN erpId:', users);

    const maxUser = await prisma.user.findFirst({
      orderBy: { erpId: 'desc' }
    });
    console.log('Max erpId User:', maxUser?.erpId);
  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();

