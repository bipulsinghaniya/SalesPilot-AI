import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: params.get('token') || '', password });
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] bg-violet-200/40 rounded-full blur-3xl" />
      </div>

      <div className="card relative z-10 w-full max-w-md p-8 shadow-xl shadow-slate-200/60 animate-slide-up">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-7">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">SalesPilot AI</span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a strong password of at least 8 characters.</p>

        {status === 'success' ? (
          <div className="mt-6 space-y-5 animate-fade-in">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-sm text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Your password has been updated successfully.</span>
            </div>
            <Link to="/login" className="btn-primary w-full py-3">
              Sign in now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {status === 'error' && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-sm text-red-700 flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>Reset token is invalid or expired.</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
