const os = require('os');

const DEV_PORTS = [5173, 4173];

function normalizeOrigin(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function localHosts() {
  const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const hostname = os.hostname();
  if (hostname) hosts.add(hostname);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.internal) continue;
      if (address.family === 'IPv4' || address.family === 4) {
        hosts.add(address.address);
      } else if ((address.family === 'IPv6' || address.family === 6) && !address.address.startsWith('fe80:')) {
        hosts.add(`[${address.address}]`);
      }
    }
  }
  return hosts;
}

function defaultOrigins(port) {
  const origins = new Set();
  for (const host of localHosts()) {
    for (const candidatePort of [port, ...DEV_PORTS]) {
      const origin = normalizeOrigin(`http://${host}:${candidatePort}`);
      if (origin) origins.add(origin);
    }
  }
  return origins;
}

function configuredOrigins(value) {
  const entries = String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) return null;

  const origins = new Set();
  for (const entry of entries) {
    const origin = normalizeOrigin(entry);
    if (origin) origins.add(origin);
    else console.warn(`CORS_ORIGINS entry is not a valid http(s) origin: ${entry}`);
  }
  return origins;
}

function getAllowedOrigins(port = process.env.PORT || 5000) {
  const configured = configuredOrigins(process.env.CORS_ORIGINS);
  if (configured) return configured;
  return defaultOrigins(port);
}

function createCorsOptions(port = process.env.PORT || 5000) {
  const allowedOrigins = getAllowedOrigins(port);

  if (allowedOrigins.size === 0) {
    console.warn('CORS: no allowed origins configured; cross-origin requests will be blocked.');
  }

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      return callback(null, Boolean(normalized && allowedOrigins.has(normalized)));
    },
  };
}

module.exports = { createCorsOptions, getAllowedOrigins, normalizeOrigin };
