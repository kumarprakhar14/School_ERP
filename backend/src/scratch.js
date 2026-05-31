
const prisma = require('./utils/db');
const { importStudents } = require('./services/importService');

async function test() {
  try {
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found');
      return;
    }
    
    const xlsx = require('xlsx');
    const ws = xlsx.utils.json_to_sheet([{
      'Student Name': 'Test User 1',
      'Class': '10',
      'Section': 'A',
      'Contact': '1234567890',
      'Admission Date': '2023-01-01'
    }, {
      'Student Name': 'Test User 2',
      'Class': '10',
      'Section': 'B',
      'Contact': '0987654321',
      'Admission Date': '2023-01-01'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    console.log('Testing import with 2 rows...');
    const result = await importStudents(school.id, buffer);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();

