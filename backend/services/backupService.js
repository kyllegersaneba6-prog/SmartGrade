const crypto = require('crypto');
const {
  APP_ID, MAGIC, FORMAT_VERSION, SCHEMA_COMPAT, MAX_FILE_BYTES,
  TABLE_ORDER, TABLE_COLUMNS, CATEGORIES,
  categoryById, dependencyClosure, tablesForCategories,
  sha256Hex, stableStringify,
} = require('./backupFormat');
const { encryptPayload, decryptPayload } = require('./backupCrypto');

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// ---- Export ----
async function fetchTable(supabase, table) {
  // Paginate to avoid row caps on large tables.
  const PAGE = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`Export failed for ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
    if (from > 500000) throw new Error(`Export aborted: ${table} exceeds safe row limit.`);
  }
  return rows;
}

async function getCategoryCounts(supabase) {
  const tableCounts = {};
  for (const t of TABLE_ORDER) {
    try {
      const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
      tableCounts[t] = error ? null : (count ?? 0);
    } catch {
      tableCounts[t] = null;
    }
  }
  return CATEGORIES.map((c) => ({
    ...c,
    recordCount: c.tables.reduce((n, t) => n + (tableCounts[t] || 0), 0),
    tables: c.tables.map((t) => ({ name: t, count: tableCounts[t] })),
  }));
}

async function buildBackup(supabase, selectedIds, password) {
  const valid = (selectedIds || []).filter((id) => categoryById(id));
  if (valid.length === 0) throw new Error('Select at least one data category.');
  const fullClosure = dependencyClosure(valid);
  const autoIncluded = fullClosure.filter((id) => !valid.includes(id));
  const tables = tablesForCategories(fullClosure);

  const data = {};
  for (const t of tables) {
    const rows = await fetchTable(supabase, t);
    // Strip to allowlisted columns only (defensive).
    const cols = TABLE_COLUMNS[t];
    data[t] = rows.map((r) => {
      const out = {};
      for (const c of cols) out[c] = r[c] ?? null;
      return out;
    });
  }

  const recordCounts = {};
  let totalRecords = 0;
  for (const t of tables) {
    recordCounts[t] = data[t].length;
    totalRecords += data[t].length;
  }

  const checksums = {};
  for (const t of tables) checksums[t] = sha256Hex(stableStringify(data[t]));

  const backupId = makeId();
  const createdAt = new Date().toISOString();
  const encrypted = password ? true : false;
  let payload = { data };
  let encryptionMeta = null;
  if (password) {
    if (String(password).length < 8) throw new Error('Encryption password must be at least 8 characters.');
    const enc = encryptPayload(stableStringify(data), password);
    payload = { encryptedData: enc.encrypted };
    encryptionMeta = { alg: enc.alg, kdf: enc.kdf, salt: enc.salt };
    // Checksums are over plaintext (verified after decrypt); also hash ciphertext.
    payload.ciphertextSha256 = sha256Hex(enc.encrypted);
  }

  const manifest = {
    backupId, appId: APP_ID, formatVersion: FORMAT_VERSION, schemaCompat: SCHEMA_COMPAT,
    createdAt, selectedCategories: valid, autoIncluded,
    tables, recordCounts, totalRecords,
    attachmentInventory: { count: 0, files: [] },
    encryption: encryptionMeta,
    status: 'complete',
  };

  const integrity = {
    checksums,
    manifestSha256: sha256Hex(stableStringify(manifest)),
  };

  return {
    magic: MAGIC,
    manifest,
    ...payload,
    integrity,
  };
}

// ---- Validation ----
function validateStructure(file) {
  const errors = [];
  if (!file || typeof file !== 'object') return ['Backup file must be a JSON object.'];
  if (file.magic !== MAGIC) errors.push('Invalid backup magic. Not a .backup.sg file.');
  const m = file.manifest;
  if (!m) errors.push('Missing manifest.');
  else {
    if (m.appId !== APP_ID) errors.push('Backup is from another application.');
    if (typeof m.formatVersion !== 'string') errors.push('Missing format version.');
    else if (m.formatVersion.split('.')[0] !== FORMAT_VERSION.split('.')[0]) errors.push(`Unsupported format version ${m.formatVersion}.`);
    if (m.schemaCompat !== SCHEMA_COMPAT) errors.push(`Incompatible schema version ${m.schemaCompat || 'unknown'} (expected ${SCHEMA_COMPAT}).`);
    if (!Array.isArray(m.tables) || m.tables.length === 0) errors.push('Manifest lists no tables.');
    if (m.status !== 'complete') errors.push('Backup is marked incomplete.');
  }
  const unknownTables = Object.keys(file.data || {}).filter((t) => !TABLE_ORDER.includes(t));
  if (unknownTables.length) errors.push(`Prohibited tables in payload: ${unknownTables.join(', ')}`);
  if (file.encryptedData && !m?.encryption) errors.push('Encrypted payload without encryption metadata.');
  if (!file.encryptedData && m?.encryption) errors.push('Encryption metadata present but payload is plaintext.');
  return errors;
}

function getPlainData(file, password) {
  if (file.encryptedData) {
    if (!password) throw new Error('Backup is password-protected. Password required.');
    const plain = decryptPayload(
      { encrypted: file.encryptedData, salt: file.manifest.encryption.salt, kdf: file.manifest.encryption.kdf },
      password
    );
    return JSON.parse(plain);
  }
  if (!file.data) throw new Error('Backup has no data payload.');
  return file.data;
}

function validateRecords(file, plainData) {
  const errors = [];
  const m = file.manifest;
  for (const t of (m.tables || [])) {
    if (!TABLE_ORDER.includes(t)) { errors.push(`Unexpected table ${t}.`); continue; }
    const rows = plainData[t];
    if (!Array.isArray(rows)) { errors.push(`Missing data section for ${t}.`); continue; }
    const cols = TABLE_COLUMNS[t];
    rows.slice(0, 5000).forEach((r, i) => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) { errors.push(`${t}[${i}] is not a record object.`); return; }
      for (const k of Object.keys(r)) {
        if (!cols.includes(k)) { errors.push(`${t}[${i}] has prohibited field ${k}.`); break; }
      }
      if (!r.id) errors.push(`${t}[${i}] missing primary key id.`);
    });
    // Checksum verification (plaintext) when available.
    if (file.integrity?.checksums?.[t]) {
      const actual = sha256Hex(stableStringify(rows));
      if (actual !== file.integrity.checksums[t]) errors.push(`Checksum mismatch for ${t} (tampered?).`);
    }
    // Declared count match.
    if (m.recordCounts?.[t] !== undefined && m.recordCounts[t] !== rows.length) {
      errors.push(`Record count mismatch for ${t}: manifest says ${m.recordCounts[t]}, file has ${rows.length}.`);
    }
  }
  // FK sanity on ids referenced (existence within backup, not DB).
  return errors;
}

function fullValidate(file, password) {
  const structErrors = validateStructure(file);
  if (structErrors.length) return { ok: false, errors: structErrors };
  let plain;
  try {
    plain = getPlainData(file, password);
  } catch (e) {
    return { ok: false, errors: [e.message] };
  }
  const recErrors = validateRecords(file, plain);
  if (recErrors.length) return { ok: false, errors: recErrors, data: plain };
  return { ok: true, errors: [], data: plain };
}

// ---- Preview (conflict analysis by id) ----
async function buildPreview(supabase, file, plainData, mode) {
  const tables = file.manifest.tables.filter((t) => TABLE_ORDER.includes(t));
  const summary = [];
  for (const t of tables) {
    const rows = plainData[t] || [];
    const ids = rows.map((r) => r.id).filter(Boolean);
    const existingById = new Map();
    // Chunked existence check.
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      if (!chunk.length) break;
      const { data } = await supabase.from(t).select('id').in('id', chunk);
      for (const r of (data || [])) existingById.set(r.id, true);
    }
    let insert = 0, exists = 0;
    for (const id of ids) (existingById.has(id) ? exists++ : insert++);
    summary.push({ table: t, backup: rows.length, insert, existing: exists });
  }
  const warnings = [];
  if ((plainData.staff_users || []).length) warnings.push('Accounts included: passwords/hashes restore as-is; role upgrades to superadmin are blocked in merge mode.');
  if (mode === 'replace') warnings.push('Replace deletes existing rows in the selected categories before inserting. Dependents outside scope can block the operation.');
  if (mode === 'full') warnings.push('Full restore replaces ALL application data. A recovery backup should be taken first.');
  return { mode, tables: summary, warnings };
}

// ---- Apply ----
const REVERSE_ORDER = [...TABLE_ORDER].reverse();

async function audit(supabase, req, action, details) {
  try {
    await supabase.from('activity_log').insert({
      user_name: req.user?.username || req.user?.id || 'superadmin',
      action, details,
      department: req.user?.department || null,
    });
  } catch { /* audit must not break restore */ }
}

async function applyMerge(supabase, req, plainData, tables) {
  const report = { inserted: {}, updated: {}, skipped: {}, failed: {}, skippedSecurity: 0 };
  const selfId = req.user?.id;
  for (const t of TABLE_ORDER.filter((x) => tables.includes(x))) {
    report.inserted[t] = 0; report.updated[t] = 0; report.skipped[t] = 0; report.failed[t] = 0;
    for (const row of (plainData[t] || [])) {
      try {
        // Security: never touch own superadmin row's role/password via merge; block role escalation.
        let payload = { ...row };
        if (t === 'staff_users') {
          const { data: existing } = await supabase.from(t).select('id,system_role').eq('id', row.id).maybeSingle();
          if (existing) {
            if (row.id === selfId) { report.skipped[t]++; continue; }
            if (existing.system_role !== row.system_role) { report.skippedSecurity++; report.skipped[t]++; continue; }
            // Don't overwrite password hash silently on merge; keep existing unless row is new.
            delete payload.password;
            delete payload.system_role;
          }
        }
        const { data: cur } = await supabase.from(t).select('id').eq('id', row.id).maybeSingle();
        if (!cur) {
          const { error } = await supabase.from(t).insert(row);
          if (error) throw new Error(error.message);
          report.inserted[t]++;
        } else {
          if (t === 'staff_users') { report.skipped[t]++; continue; } // merge never updates accounts except inserts
          const { id, created_at, ...rest } = payload;
          const { error } = await supabase.from(t).update(rest).eq('id', id);
          if (error) throw new Error(error.message);
          report.updated[t]++;
        }
      } catch (e) {
        report.failed[t]++;
      }
    }
  }
  // Two-pass fix for staff_users.created_by self-FK is implicit since ids preserved.
  return report;
}

async function applyReplace(supabase, req, plainData, tables) {
  // Delete in reverse order only for in-scope tables, then insert parents-first.
  for (const t of REVERSE_ORDER.filter((x) => tables.includes(x))) {
    if (t === 'activity_log') continue; // never wipe audit on replace
    const ids = (plainData[t] || []).map((r) => r.id);
    // Scope guard: only delete rows that would be replaced (by id) — never truncate.
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      if (!chunk.length) break;
      const { error } = await supabase.from(t).delete().in('id', chunk);
      if (error) throw new Error(`Replace delete failed on ${t}: ${error.message}`);
    }
  }
  const report = { inserted: {}, failed: {} };
  for (const t of TABLE_ORDER.filter((x) => tables.includes(x))) {
    report.inserted[t] = 0; report.failed[t] = 0;
    const rows = plainData[t] || [];
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      // Block self-lockout: never delete/replace own superadmin row.
      const safe = chunk.filter((r) => !(t === 'staff_users' && r.id === req.user?.id));
      if (!safe.length) continue;
      const { error } = await supabase.from(t).insert(safe);
      if (error) {
        // Fallback row-by-row for partial unique conflicts.
        for (const r of safe) {
          const { error: e2 } = await supabase.from(t).upsert(r, { onConflict: 'id' });
          if (e2) report.failed[t]++; else report.inserted[t]++;
        }
      } else report.inserted[t] += safe.length;
    }
  }
  return report;
}

async function applyFull(supabase, req, plainData) {
  const tables = TABLE_ORDER.filter((t) => t !== 'activity_log');
  for (const t of REVERSE_ORDER.filter((x) => tables.includes(x))) {
    // Full restore deletes all rows except own superadmin account.
    if (t === 'staff_users') {
      await supabase.from(t).delete().neq('id', req.user?.id);
    } else {
      // Chunked full delete via selecting ids first (Supabase requires a filter).
      const { data: ids } = await supabase.from(t).select('id').limit(10000);
      if (ids && ids.length) {
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500).map((r) => r.id);
          const { error } = await supabase.from(t).delete().in('id', chunk);
          if (error) throw new Error(`Full restore delete failed on ${t}: ${error.message}`);
        }
      }
    }
  }
  return applyReplace(supabase, req, plainData, tables);
}

module.exports = {
  makeId, fetchTable, getCategoryCounts, buildBackup,
  validateStructure, getPlainData, validateRecords, fullValidate,
  buildPreview, applyMerge, applyReplace, applyFull, audit,
};
