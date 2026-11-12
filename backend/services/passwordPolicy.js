const MIN_PASSWORD_BYTES = 12;
const MAX_PASSWORD_BYTES = 72;

function passwordLengthBytes(password) {
  return Buffer.byteLength(password, 'utf8');
}

function getPasswordValidationError(password) {
  if (typeof password !== 'string') return 'Password must be a string.';
  const length = passwordLengthBytes(password);
  if (length < MIN_PASSWORD_BYTES) return `Password is too short. Please use at least ${MIN_PASSWORD_BYTES} characters.`;
  if (length > MAX_PASSWORD_BYTES) return 'Password is too long. Please use a shorter password.';
  return null;
}

module.exports = { MIN_PASSWORD_BYTES, MAX_PASSWORD_BYTES, getPasswordValidationError };
