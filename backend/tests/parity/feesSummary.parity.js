/**
 * Parity harness for fees/summary
 * Runs current JS logic (in-memory) vs new repository raw SQL.
 * Requires live DB + seeded schoolId. Skips if DATABASE_URL not set.
 * This file is a template — Phase 2 plugs FeeSummaryRepository.
 */
import prisma from '../../src/utils/db.js';

// Current JS implementation extracted (mirrors feeController.js:121-171)
function currentSummary(students) {
  return students.map(student => {
    let totalAmount = 0, totalPaid = 0, earliestPending = null;
    student.feeInvoices.forEach(inv => {
      totalAmount += inv.totalAmount;
      let invoicePaid = 0;
      inv.payments.forEach(p => { if (p.status === 'SUCCESS' || !p.status) invoicePaid += p.amount; });
      totalPaid += invoicePaid;
      if (invoicePaid < inv.totalAmount && inv.dueDate && (!earliestPending || inv.dueDate < earliestPending)) earliestPending = inv.dueDate;
    });
    const dueAmount = totalAmount - totalPaid;
    let status = 'NO_FEES';
    if (student.feeInvoices.length === 0) status = 'NO_FEES';
    else if (dueAmount <= 0) status = 'PAID';
    else {
      if (totalPaid > 0) status = 'PARTIALLY_PAID'; else status = 'PENDING';
      if (earliestPending && earliestPending < new Date()) status = 'OVERDUE';
    }
    return { id: student.id, totalAmount, dueAmount, dueDate: earliestPending, status };
  }).sort((a,b)=> a.id.localeCompare(b.id));
}

async function main() {
  const schoolId = process.env.PARITY_SCHOOL_ID;
  if (!schoolId) {
    console.log('[feesSummary.parity] PARITY_SCHOOL_ID not set — skipping live check. Template only.');
    console.log('Seed a school with 100 students then run with PARITY_SCHOOL_ID=xxx');
    process.exit(0);
  }

  // Fetch same shape current impl loads
  const students = await prisma.user.findMany({
    where: { schoolId, role: 'STUDENT', isActive: true },
    select: {
      id: true, name: true, erpId: true,
      studentProfile: { include: { section: { include: { class: true } } } },
      feeInvoices: { include: { payments: true } }
    },
    orderBy: [{ id: 'asc' }]
  });

  const cur = currentSummary(students);
  console.log(`[feesSummary.parity] current rows ${cur.length}`);

  // TODO Phase2: import new repository and compare
  // const { FeeSummaryRepository } = await import('../../src/repositories/FeeSummaryRepository.js');
  // const { data } = await FeeSummaryRepository.getPaginated(schoolId, { page:1, limit:1000, q:'' });
  // const nxt = data.map(r=> ({ id:r.studentId, totalAmount: r.totalAmount, dueAmount: r.dueAmount, dueDate: r.dueDate, status: r.status })).sort((a,b)=>a.id.localeCompare(b.id));
  // compare cur vs nxt, allowing fix diff (null status strict)
  console.log('[feesSummary.parity] harness ready — plug repository in Phase 2');
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
