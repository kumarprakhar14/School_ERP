/**
 * Pagination utilities — single canonical contract across backend.
 *
 * Standard response: { data: T[], pagination: { page, limit, total, totalPages } }
 * Transition compat: also sets X-Total-* headers until FE migrated.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Parse and clamp pagination params. Used by Zod-validated routes, but also safe fallback.
 * Throws BadRequest (400) if non-numeric.
 */
export function parsePagination(query) {
  let page = query.page !== undefined ? Number(query.page) : DEFAULT_PAGE;
  let limit = query.limit !== undefined ? Number(query.limit) : DEFAULT_LIMIT;

  if (Number.isNaN(page) || Number.isNaN(limit)) {
    const err = new Error('Invalid pagination params: page and limit must be numbers');
    err.status = 400;
    throw err;
  }

  page = Math.max(1, Math.floor(page));
  limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/**
 * Build canonical paginated envelope.
 * @param {Array} data
 * @param {number} total - total matching rows before pagination
 * @param {number} page
 * @param {number} limit
 * @returns {{data:Array, pagination:{page,limit,total,totalPages}}}
 */
export function paginatedEnvelope(data, total, page, limit) {
  return {
    data,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

/**
 * Send paginated JSON + compat headers.
 * Keeps X-Total-* for one release so old FE reading headers still works.
 * Domain envelope (e.g. ReportEngine {metadata,data,pagination}) should pass overrideKey.
 */
export function sendPaginated(res, data, total, page, limit, opts = {}) {
  const envelope = paginatedEnvelope(data, total, page, limit);

  // Compat headers — remove after Phase 5
  res.setHeader('X-Total-Count', String(total));
  res.setHeader('X-Total-Pages', String(envelope.pagination.totalPages));
  res.setHeader('X-Current-Page', String(page));
  res.setHeader('X-Limit', String(limit));

  // If caller wants to preserve legacy wrapped key (e.g. {bugs, pagination} or {metadata, data, pagination})
  if (opts.legacyKey) {
    return res.json({ [opts.legacyKey]: data, pagination: envelope.pagination });
  }
  if (opts.reportEnvelope) {
    // opts.reportEnvelope = { metadata }
    return res.json({ ...opts.reportEnvelope, ...envelope });
  }

  return res.json(envelope);
}

/**
 * Helper: stable orderBy for Prisma. Appends secondary id ASC for determinism.
 * @param {Array|Object} primary - e.g. {createdAt:'desc'} or [{createdAt:'desc'}]
 * @returns {Array}
 */
export function stableOrderBy(primary, secondary = { id: 'asc' }) {
  const arr = Array.isArray(primary) ? primary : [primary];
  // Avoid duplicate id if already present
  const hasId = arr.some(o => o && typeof o === 'object' && 'id' in o);
  return hasId ? arr : [...arr, secondary];
}

/**
 * Generic Prisma paginate helper — enforces DB-level pagination via skip/take.
 * Caller must supply where, orderBy (stable), select/include.
 * Returns {data, pagination} envelope data for sendPaginated.
 */
export async function paginatePrisma(modelDelegate, { where, orderBy, select, include, page, limit }) {
  const skip = (page - 1) * limit;
  const stable = orderBy ? stableOrderBy(orderBy) : [{ id: 'asc' }];

  const [data, total] = await Promise.all([
    modelDelegate.findMany({ where, orderBy: stable, skip, take: limit, ...(select ? { select } : {}), ...(include ? { include } : {}) }),
    modelDelegate.count({ where }),
  ]);

  return { data, total };
}
