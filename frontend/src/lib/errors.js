/**
 * Turns any failed request into a clear message for the user.
 *
 * Order of preference:
 *  1. The specific message the server sent (now always human-readable)
 *  2. A helpful message based on what kind of failure it was
 *     (offline, timeout, server down, permission, not found…)
 *  3. The caller's own fallback, e.g. "Failed to save expense"
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  // The request never got an answer: server off, wrong proxy, or user offline
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
      return 'The server is taking too long to respond. Please try again.';
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return "You appear to be offline. Check your internet connection and try again.";
    }
    if (err?.request) {
      return "Can't reach the server. Make sure the backend is running, then try again.";
    }
    // Not an HTTP error at all (a bug in our own code, for instance)
    return fallback;
  }

  const { status, data } = err.response;
  const serverMessage = typeof data?.error === 'string' ? data.error : null;

  // Server errors: keep the context of what failed, add a calm explanation
  if (status >= 500) {
    return `${fallback}. ${serverMessage || 'The server ran into a problem. Please try again in a moment.'}`;
  }

  if (serverMessage) return serverMessage;

  // No message from the server: fall back on the status code
  switch (status) {
    case 400: return `${fallback}. Please check what you entered.`;
    case 401: return 'Your session has expired. Please sign in again.';
    case 403: return "You don't have permission to do that.";
    case 404: return 'That could not be found. It may have been deleted.';
    case 409: return 'That conflicts with something that already exists.';
    case 413: return 'That is too large to send.';
    case 429: return 'Too many attempts. Please wait a moment and try again.';
    default:  return fallback;
  }
}

/** True when the failure means "you no longer have access to this trip". */
export const isAccessError = (err) => [403, 404].includes(err?.response?.status);
