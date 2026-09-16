/**
 * unwrapPaginated — compat helper while backend migrates from
 * header-based (X-Total-*) / raw array to canonical JSON {data, pagination}.
 *
 * Handles 3 shapes:
 *  1) Canonical JSON: { data: [...], pagination: {page,limit,total,totalPages} }
 *  2) Legacy envelope with headers: Array + X-Total-* headers
 *  3) Legacy wrapped key: { bugs: [...] } + headers
 *
 * Returns { data: T[], pagination: {page,limit,total,totalPages}|null, raw }
 */

export function unwrapPaginated(res) {
  const body = res?.data;
  const headers = res?.headers || {};

  // Helper to read header case-insensitively
  const getHeader = (name) => {
    if (!headers) return null;
    // axios headers may be lowercased
    return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toLowerCase().replace(/-/g, '-')] ?? null;
  };

  // 1) Canonical JSON with pagination
  if (body && typeof body === 'object' && Array.isArray(body.data) && body.pagination) {
    return { data: body.data, pagination: body.pagination, raw: body };
  }

  // 1b) Canonical report shape { metadata, data, pagination } — data is array
  if (body && typeof body === 'object' && Array.isArray(body.data) && body.metadata) {
    // report list endpoint after migration: { metadata, data, pagination }
    if (body.pagination) {
      return { data: body.data, pagination: body.pagination, metadata: body.metadata, raw: body };
    }
  }

  // 1c) Canonical with legacy key + pagination e.g. { bugs: [...], pagination }
  if (body && typeof body === 'object' && body.pagination && (Array.isArray(body.bugs) || Array.isArray(body.notifications))) {
    const data = body.bugs || body.notifications || body.data;
    return { data, pagination: body.pagination, raw: body };
  }

  // 2) Legacy: { bugs: [...] } + possible headers
  if (body && typeof body === 'object' && Array.isArray(body.bugs)) {
    const total = getHeader('x-total-count');
    if (total !== null && total !== undefined) {
      return {
        data: body.bugs,
        pagination: {
          page: Number(getHeader('x-current-page') || 1),
          limit: Number(getHeader('x-limit') || body.bugs.length || 20),
          total: Number(total),
          totalPages: Number(getHeader('x-total-pages') || Math.ceil(Number(total) / Number(getHeader('x-limit') || 20))),
        },
        raw: body,
      };
    }
    return { data: body.bugs, pagination: null, raw: body };
  }

  // 2b) Notifications shape { notifications: [...], pagination }
  if (body && typeof body === 'object' && Array.isArray(body.notifications)) {
    if (body.pagination) return { data: body.notifications, pagination: body.pagination, raw: body };
    // fallback headers
    const total = getHeader('x-total-count');
    if (total) {
      return {
        data: body.notifications,
        pagination: {
          page: Number(getHeader('x-current-page') || 1),
          limit: Number(getHeader('x-limit') || 20),
          total: Number(total),
          totalPages: Number(getHeader('x-total-pages') || 1),
        },
        raw: body,
      };
    }
    return { data: body.notifications, pagination: body.pagination || null, raw: body };
  }

  // 3) Legacy raw array + headers
  if (Array.isArray(body)) {
    const total = getHeader('x-total-count');
    if (total !== null && total !== undefined) {
      return {
        data: body,
        pagination: {
          page: Number(getHeader('x-current-page') || 1),
          limit: Number(getHeader('x-limit') || body.length || 20),
          total: Number(total),
          totalPages: Number(getHeader('x-total-pages') || Math.ceil(Number(total) / Number(getHeader('x-limit') || 20))),
        },
        raw: body,
      };
    }
    return { data: body, pagination: null, raw: body };
  }

  // Unknown shape — return body as data
  return { data: body, pagination: body?.pagination || null, raw: body };
}

/**
 * Shorthand when caller just wants array.
 */
export function unwrapData(res) {
  return unwrapPaginated(res).data;
}
