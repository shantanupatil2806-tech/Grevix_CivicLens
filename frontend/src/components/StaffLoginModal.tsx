// frontend/src/components/StaffLoginModal.tsx
import React, { useState } from 'react';
import {
  loginUser,
  forgotPasswordApi,
  changePasswordApi,
  AuthUser
} from '../services/api';
import {
  ShieldAlert,
  Wrench,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export default function StaffLoginModal({ isOpen, onClose, onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Sub-views: 'login' | 'forgot' | 'change'
  const [view, setView] = useState<'login' | 'forgot' | 'change'>('login');

  // Change password fields (when user must change password after first login)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

  function closeModal() {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    setInfoMsg(null);
    setView('login');
    setNewPassword('');
    setConfirmPassword('');
    setPendingUser(null);
    onClose();
  }

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const res = await loginUser(email.trim(), password);
      // Token is stored by loginUser() so change-password API is authenticated.
      if (res.user.mustChangePassword) {
        setPendingUser(res.user);
        setView('change');
        setInfoMsg('First-time login: Please choose a new personal password to continue.');
      } else {
        onLoginSuccess(res.user);
        closeModal();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const res = await forgotPasswordApi(email.trim());
      setInfoMsg(res.message);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // The JWT is already stored from handleLogin above, so this call is authenticated.
      // Pass the original login password as currentPassword (admin-set initial password).
      await changePasswordApi(password, newPassword);
      if (pendingUser) {
        onLoginSuccess({ ...pendingUser, mustChangePassword: false });
      }
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setInfoMsg(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            {view === 'change' ? <KeyRound size={26} /> : <ShieldCheck size={26} />}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {view === 'login' && 'Municipal Staff Login'}
            {view === 'forgot' && 'Reset Staff Credentials'}
            {view === 'change' && 'Change Staff Password'}
          </h2>
          <p className="text-xs text-slate-400">
            {view === 'login' && 'Single portal access for Officers, Maintenance Workers, and Admins.'}
            {view === 'forgot' && 'Accounts are provisioned by Municipal Administrators.'}
            {view === 'change' && 'Choose a secure new password for your account.'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-xs text-blue-300 flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-blue-400" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* View 1: Main Login Form */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Official Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civiclens.gov"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-600"
                />
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError(null);
                    setInfoMsg(null);
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-600"
                />
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In &amp; Launch Portal</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Quick Demo Pre-fill Chips for Testing */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 text-center">
                Quick Test Staff Accounts (Click to Fill):
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@civiclens.gov', 'admin123')}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-purple-300 border border-slate-700 text-center font-semibold cursor-pointer"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('officer@civiclens.gov', 'password123')}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-blue-300 border border-slate-700 text-center font-semibold cursor-pointer"
                >
                  Officer
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('worker.roads@civiclens.gov', 'password123')}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-slate-700 text-center font-semibold cursor-pointer"
                >
                  Worker
                </button>
              </div>
            </div>
          </form>
        )}

        {/* View 2: Forgot Password Form */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@civiclens.gov"
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Staff accounts are created by administrators. If locked out, the Municipal Admin can also generate new credentials directly from the Admin Console.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError(null);
                  setInfoMsg(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Reset'}
              </button>
            </div>
          </form>
        )}

        {/* View 3: Change Password Required */}
        {view === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <KeyRound size={14} className="shrink-0 mt-0.5" />
              <span>Admin has set an initial password for this account. Please set your own personal password to continue.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                New Password (Min 6 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Set Password & Go to Dashboard'}
            </button>

            <button
              type="button"
              onClick={() => {
                // Skip password change — proceed to dashboard with existing credentials
                if (pendingUser) onLoginSuccess({ ...pendingUser, mustChangePassword: false });
                closeModal();
              }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
            >
              Skip for now (change password later from settings)
            </button>
          </form>
        )}
      </div>
    </div>

  );
}
