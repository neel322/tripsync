/**
 * Central error helpers so every endpoint answers with a clear,
 * human-readable message and a sensible HTTP status instead of a blanket
 * "Internal server error".
 */

// Postgres / PostgREST error codes -> friendly message + HTTP status
const DB_ERRORS = {
  '23503': [409, 'This action refers to something that no longer exists (for example a removed member or a deleted item). Refresh the page and try again.'],
  '23505': [409, 'That already exists.'],
  '23502': [400, 'A required field is missing.'],
  '23514': [400, 'One of the values is not allowed. Please check your input.'],
  '22P02': [400, 'One of the IDs or values has an invalid format.'],
  '22007': [400, 'One of the dates is not valid.'],
  '22008': [400, 'One of the dates is not valid.'],
  '22003': [400, 'A number is too large or too small.'],
  '22001': [400, 'A text value is too long.'],
  'PGRST116': [404, 'The requested item was not found.'],
};

/** Send a JSON error: { error: "message" } */
const sendError = (res, status, message) => res.status(status).json({ error: message });

/**
 * Use inside every controller's catch block.
 * Logs the real error on the server, replies with the most useful safe message.
 */
const handleError = (res, err, context = 'request') => {
  console.error(`${context} error:`, err);

  // Database rejected the query
  if (err && err.code && DB_ERRORS[err.code]) {
    const [status, message] = DB_ERRORS[err.code];
    return sendError(res, status, message);
  }

  // Database / network unreachable (Supabase down, wrong URL, no internet)
  const text = `${err?.message || ''} ${err?.cause?.code || ''}`;
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network/i.test(text)) {
    return sendError(res, 503, 'The database is temporarily unreachable. Please try again in a moment.');
  }

  return sendError(res, 500, 'Something went wrong on our side. Please try again.');
};

// ── Small validators (return an error string, or null when valid) ──

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-31). */
const isValidDate = (v) => {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

module.exports = {
  sendError, handleError,
  isUuid, isValidDate, isEmail, isNonEmptyString,
};
