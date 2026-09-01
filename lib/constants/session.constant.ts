/**
 * Single source of truth for Session Timing configuration.
 * Change SESSION_MINUTES to adjust session timeout across the entire app.
 */
export const SESSION_MINUTES = 60;

// Derived values
export const SESSION_DURATION_SECONDS = SESSION_MINUTES * 60;
export const SESSION_DURATION_JWT = `${SESSION_MINUTES}m`;
export const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
