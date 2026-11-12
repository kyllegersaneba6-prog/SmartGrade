export const getPasswordValidationError = (password) => {
  if (typeof password !== 'string') return 'Password must be text.';
  const bytes = new TextEncoder().encode(password).length;
  if (bytes < 12) return 'Password is too short. Please use at least 12 characters.';
  if (bytes > 72) return 'Password is too long. Please use a shorter password.';
  return null;
};
