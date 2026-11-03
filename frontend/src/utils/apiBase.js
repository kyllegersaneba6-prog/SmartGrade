const DEFAULT_API_BASE = `http://${window.location.hostname}:5000`;

// Shared by API calls and the anonymous backend-availability probe.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '');
