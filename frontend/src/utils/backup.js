// Client helpers for .backup.sg files. No secrets logged.
export const BACKUP_EXT = '.backup.sg';
export const BACKUP_MAGIC = 'SGBK';
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function buildFilename(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `backup_${stamp}${BACKUP_EXT}`;
}

export function downloadBackupFile(filename, fileObj) {
  const blob = new Blob([JSON.stringify(fileObj)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function readBackupFile(file) {
  if (!file.name.endsWith(BACKUP_EXT)) throw new Error(`File must end with ${BACKUP_EXT}.`);
  if (file.size > MAX_FILE_BYTES) throw new Error('File exceeds 50MB limit.');
  if (file.size === 0) throw new Error('File is empty.');
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not a valid backup (unparseable). A renamed non-backup file was rejected.');
  }
  if (parsed.magic !== BACKUP_MAGIC) throw new Error('Invalid backup magic. Not a .backup.sg file.');
  return parsed;
}

export function estimateSize(fileObj) {
  try {
    const bytes = new Blob([JSON.stringify(fileObj)]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return 'unknown';
  }
}
