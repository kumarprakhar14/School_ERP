import prisma from '../src/utils/db.js';
import crypto from 'crypto';

async function main() {
  console.log('Starting fee migration...');

  // 1. Fetch all FeeRecords
  const oldFeeRecords = await prisma.feeRecord.findMany();
  console.log(`Found ${oldFeeRecords.length} old FeeRecords to migrate.`);

  // 2. Iterate and migrate
  let invoicesCreated = 0;
  let paymentsCreated = 0;

  for (const record of oldFeeRecords) {
    const invoiceNumber = `INV-${record.year}-${record.month}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    // Create FeeInvoice
    const invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber,
        schoolId: record.schoolId,
        studentId: record.studentId,
        month: record.month,
        year: record.year,
        totalAmount: record.amount,
        dueDate: new Date(record.year, record.month - 1, 10), // Assuming 10th of the month was default due date
        remarks: record.remarks,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
    invoicesCreated++;

    // Create Payment if status is PAID or if there's a paidAt / paymentMode
    if (record.status === 'PAID' || record.paidAt || record.paymentMode || record.referenceNo) {
      await prisma.payment.create({
        data: {
          schoolId: record.schoolId,
          invoiceId: invoice.id,
          amount: record.amount,
          paymentMode: record.paymentMode,
          referenceNo: record.referenceNo,
          remarks: record.remarks,
          paidAt: record.paidAt || record.updatedAt || new Date(),
          receivedBy: record.updatedBy || record.createdBy,
          createdAt: record.updatedAt, // assuming payment was made at updated time
        },
      });
      paymentsCreated++;
    }
  }

  console.log(`Migration complete! Created ${invoicesCreated} invoices and ${paymentsCreated} payments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
