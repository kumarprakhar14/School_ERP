/**
 * Parity harness for defaulters — compare daysOverdue before/after fix.
 * Old: EXTRACT(DAY FROM CURRENT_DATE - dueDate)  (day component only)
 * New: (CURRENT_DATE - dueDate)::int               (total days)
 * Also JOIN vs LEFT JOIN.
 */
import prisma from '../../src/utils/db.js';

async function main(){
  const schoolId = process.env.PARITY_SCHOOL_ID;
  if(!schoolId){ console.log('[defaulters.parity] PARITY_SCHOOL_ID not set — skipping.'); process.exit(0); }
  // Raw old query
  const oldRows = await prisma.$queryRawUnsafe(`
    SELECT f.id, f."dueDate", EXTRACT(DAY FROM (CURRENT_DATE - f."dueDate")) as "daysOverdue_old",
           (CURRENT_DATE - f."dueDate")::int as "daysOverdue_new"
    FROM "FeeInvoice" f
    WHERE f."schoolId" = $1 AND f."dueDate" IS NOT NULL AND f."dueDate" < CURRENT_DATE
    ORDER BY "daysOverdue_old" DESC LIMIT 5
  `, schoolId);
  console.log('[defaulters.parity] sample rows', oldRows);
  console.log('Note: mismatches where interval > 30d are expected fix.');
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
