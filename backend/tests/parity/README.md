# Parity Harness — Pagination Must-now Endpoints

> Before Phase 2 DB pagination, run these scripts against a seeded school
> to ensure new raw-SQL implementations return identical business semantics
> to current JS implementations, except for explicitly documented fixes.

## Fixes that WILL cause deliberate mismatches (documented):
- `fees/summary` legacy `!p.status == SUCCESS` → strict `status='SUCCESS'` only (null no longer counted)
- `defaulters` `EXTRACT(DAY FROM (CURRENT_DATE - dueDate))` → `(CURRENT_DATE - dueDate)::int` (total days, not day-component)
- `defaulters` `JOIN StudentProfile` vs `LEFT JOIN` — unify to `LEFT JOIN` so students without profile are not dropped
- `attendance` missing `orderBy` → `ORDER BY date DESC, id ASC` (previously nondeterministic)
- Reports ranking/low-attendance add secondary `u.id ASC` tie-break

## Datasets (representative):
- School with 100 students, 2 classes × 2 sections, 6 invoices each, mixed SUCCESS/PENDING/null payments, staggered dueDates (overdue / future)
- History: invoices spanning 3 months + payments interleaved
- Defaulters: 500 overdue invoices with same `dueDate` ties
- Low-attendance: 200 students with identical percentages

## Scripts:
- `feesSummary.parity.js` — compares current `feeController.getFeeSummary` JS loop vs new `FeeSummaryRepository` raw SQL
- `feesHistory.parity.js` — compares JS flatten+sort vs `UNION ALL` SQL
- `defaulters.parity.js` — compares current `$queryRawUnsafe` vs new paginated + search + fixed daysOverdue
- `lowAttendance.parity.js` — compares current unbounded vs new LIMIT/OFFSET

Run:
```
node tests/parity/feesSummary.parity.js
node tests/parity/feesHistory.parity.js
node tests/parity/defaulters.parity.js
node tests/parity/lowAttendance.parity.js
```
Each exits 0 on parity (within fixes), prints diff on failure.

Phase 2 implementations must pass before merging.
