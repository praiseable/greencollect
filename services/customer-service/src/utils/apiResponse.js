/**
 * Standard API response envelope (Kabariya spec).
 * Every response uses: success(data) | paginated(items, meta) | error(message, code, errors)
 */

function success(data) {
  return { success: true, data: data ?? null };
}

function paginated(items, meta) {
  return {
    success: true,
    data: items,
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: meta.totalPages ?? Math.ceil((meta.total || 0) / (meta.limit || 20)),
      hasNext: meta.hasNext ?? (meta.page < (meta.totalPages ?? Math.ceil((meta.total || 0) / (meta.limit || 20)))),
      hasPrev: meta.hasPrev ?? (meta.page > 1),
    },
  };
}

function error(message, code = 'ERROR', errors = null) {
  const body = { success: false, message, code };
  if (errors && Array.isArray(errors)) body.errors = errors;
  return body;
}

module.exports = { success, paginated, error };
