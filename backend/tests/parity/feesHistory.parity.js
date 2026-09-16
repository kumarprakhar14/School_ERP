/**
 * Parity harness for fees/history — JS flatten+sort vs UNION ALL SQL.
 */
import prisma from '../../src/utils/db.js';

function currentHistory(invoices) {
  let history = [];
  invoices.forEach(inv => {
    history.push({ id: inv.id, type:'Invoice', invoiceNumber: inv.invoiceNumber, amount: inv.totalAmount, date: inv.createdAt });
    inv.payments.forEach(pay => history.push({ id: pay.id, type:'Payment', invoiceNumber: inv.invoiceNumber, amount: pay.amount, date: pay.paidAt }));
  });
  history.sort((a,b)=> new Date(b.date) - new Date(a.date) || a.id.localeCompare(b.id));
  return history;
}

async function main(){
  const schoolId = process.env.PARITY_SCHOOL_ID;
  if(!schoolId){ console.log('[feesHistory.parity] PARITY_SCHOOL_ID not set — skipping.'); process.exit(0); }
  const invoices = await prisma.feeInvoice.findMany({
    where:{ schoolId },
    include:{ payments:true },
    orderBy:{ createdAt:'desc' }
  });
  const cur = currentHistory(invoices);
  console.log(`[feesHistory.parity] current rows ${cur.length} (invoices ${invoices.length})`);
  console.log('[feesHistory.parity] harness ready — plug TransactionHistoryRepository in Phase 2');
  process.exit(0);
}
main().catch(e=>{ console.error(e); process.exit(1); });
