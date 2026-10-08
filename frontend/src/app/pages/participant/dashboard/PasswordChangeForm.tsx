import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { api } from '../../../services/api';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Check your current password.');
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Current password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 pr-10 placeholder:text-muted-foreground/50 transition-all"
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {/* New Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">New password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 pr-10 placeholder:text-muted-foreground/50 transition-all"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {/* Confirm Password */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className="w-full rounded-xl bg-input border border-border px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
        />
      </div>
      {error && <p className="text-sm text-destructive flex items-center gap-1.5">{error}</p>}
      {success && (
        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-primary flex items-center gap-1.5">
          <Check size={14} /> Password updated successfully
        </motion.p>
      )}
      <button
        type="submit"
        className="w-full px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary text-sm font-medium hover:bg-primary/25 transition-all"
      >
        Update Password
      </button>
    </form>
  );
}
