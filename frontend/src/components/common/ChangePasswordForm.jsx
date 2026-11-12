import { useState } from 'react';
import api from '../../utils/api';
import { getPasswordValidationError } from '../../utils/passwordPolicy';

const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || saved) return;
    setError('');

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) return setError(passwordError);
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    if (newPassword === currentPassword) return setError('Choose a new password different from your current password.');

    setSaving(true);
    try {
      const response = await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Could not update your password.');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_view_term');
      localStorage.removeItem('teacher_view_term');
      localStorage.removeItem('superadmin_view_term');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      window.setTimeout(() => window.location.assign('/login'), 1500);
    } catch (requestError) {
      setError(requestError.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-50 bg-white p-6 shadow-sm card-hover">
      <h2 className="mb-1 text-sm font-bold text-gray-900">Change Password</h2>
      <p className="mb-4 text-xs text-gray-600">Use a unique password. Changing it signs out every active session for this account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1 block text-xs font-semibold text-gray-800">Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#142a3f]"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-gray-800">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#142a3f]"
          />
          <p className="mt-1 text-[11px] text-gray-500">12–72 UTF-8 bytes.</p>
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="mb-1 block text-xs font-semibold text-gray-800">Confirm new password</label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#142a3f]"
          />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
        {saved && <p role="status" className="text-sm font-semibold text-emerald-700">Password updated. Redirecting to sign in…</p>}
        <button
          type="submit"
          disabled={saving || saved}
          className="rounded-lg bg-[#142a3f] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0c1925] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Updating…' : saved ? 'Updated' : 'Update Password'}
        </button>
      </form>
    </section>
  );
};

export default ChangePasswordForm;
