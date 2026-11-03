import { API_BASE } from './apiBase';

const CHECK_INTERVAL_MS = 5000;
const CHECK_TIMEOUT_MS = 5000;
const listeners = new Set();
let snapshot = { status: 'checking', checking: true, hasConnected: false };
let interval;
let activeRequest = null;

const publish = (next) => {
  snapshot = next;
  for (const listener of listeners) listener();
};

export const getBackendStatus = () => snapshot;

export const checkBackendAvailability = () => {
  if (activeRequest) return activeRequest.promise;
  const request = { controller: new AbortController(), promise: null };
  activeRequest = request;
  publish({ ...snapshot, checking: true });
  const timeout = window.setTimeout(() => request.controller.abort(), CHECK_TIMEOUT_MS);

  request.promise = (async () => {
    let available = false;
    try {
      // No auth/archive headers or database access. Do not use the API wrapper
      // here: a failed probe must not recursively request another probe.
      const response = await fetch(`${API_BASE}/api/health`, {
        cache: 'no-store',
        signal: request.controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        available = data?.status === 'ok' && data?.service === 'smartgrade-api';
      }
    } catch {
      // Connection refusal, CORS/network failures, timeouts, and invalid health
      // responses all mean this browser cannot currently reach the service.
      available = false;
    } finally {
      window.clearTimeout(timeout);
      // StrictMode cleanup or an unmount can cancel an older check. It must not
      // overwrite a later subscription's result or display a false outage.
      if (activeRequest === request) {
        activeRequest = null;
        publish({ status: available ? 'available' : 'unavailable', checking: false,
          hasConnected: snapshot.hasConnected || available });
      }
    }
  })();
  return request.promise;
};

export const subscribeBackendStatus = (listener) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('online', checkBackendAvailability);
    window.addEventListener('focus', checkBackendAvailability);
    interval = window.setInterval(checkBackendAvailability, CHECK_INTERVAL_MS);
    void checkBackendAvailability();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.clearInterval(interval);
      window.removeEventListener('online', checkBackendAvailability);
      window.removeEventListener('focus', checkBackendAvailability);
      const request = activeRequest;
      activeRequest = null;
      request?.controller.abort();
    }
  };
};
