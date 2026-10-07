// Staff ID helpers — display format 00000-0000, stored raw as 9 digits (TEXT).
export const staffIdToDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 9);

export const formatStaffId = (value) => {
  const digits = staffIdToDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const isValidStaffId = (value) => staffIdToDigits(value).length === 9;

export const displayStaffId = (raw) => {
  if (!raw) return '—';
  return formatStaffId(raw);
};

// Username rule: last 2 digits of the first 5-digit portion +
// first 2 digits of the second 4-digit portion (raw 9 digits).
// 12345-1234 -> "4512". Returns '' until all 9 digits are present.
// Always a string — leading zeros are preserved.
export const usernameFromStaffId = (value) => {
  const digits = staffIdToDigits(value);
  if (digits.length !== 9) return '';
  return digits.slice(3, 7);
};

// Last name normalization for usernames: lowercase, trimmed,
// internal whitespace becomes dots ("Dela Cruz" -> "dela.cruz").
export const normalizeLastName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '.')
  .replace(/[^a-z0-9.]/g, '')
  .replace(/\.+/g, '.')
  .replace(/^\.|\.$/g, '');

// Full username: lastname.4512@sg — e.g. ("Santos", "12345-1234").
// Returns '' until BOTH last name and all 9 ID digits are present.
export const usernameFromLastNameAndId = (lastName, staffId) => {
  const norm = normalizeLastName(lastName);
  const code = usernameFromStaffId(staffId);
  if (!norm || !code) return '';
  return `${norm}.${code}@sg`;
};

// Last token(s) after the first word: "Juan Dela Cruz" -> "Dela Cruz".
export const lastNameFromFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
};
