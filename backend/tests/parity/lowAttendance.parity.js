/**
 * Parity harness for low-attendance — unbounded vs paginated.
 */
import prisma from '../../src/utils/db.js';
async function main(){
  const schoolId = process.env.PARITY_SCHOOL_ID;
  if(!schoolId){ console.log('[lowAttendance.parity] PARITY_SCHOOL_ID not set — skipping.'); process.exit(0); }
  const startDate = new Date(Date.now() - 30*24*60*60*1000);
  const endDate = new Date();
  // Call repository after Phase 2
  console.log('[lowAttendance.parity] harness ready — plug AttendanceReportRepository paginated in Phase 2');
  console.log({ schoolId, startDate, endDate });
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
