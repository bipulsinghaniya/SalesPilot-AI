import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('verified'))
      .catch(() => setStatus('error'));
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] bg-violet-200/40 rounded-full blur-3xl" />
      </div>

      <div className="card relative z-10 w-full max-w-md p-8 text-center shadow-xl shadow-slate-200/60 animate-slide-up">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20 mb-5">
          <Sparkles className="h-5 w-5" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Verification</h1>

        <div className="mt-5">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
              <span>Verifying your email address...</span>
            </div>
          )}
          {status === 'verified' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-sm text-emerald-800 flex items-center justify-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Your email has been verified!</span>
            </div>
          )}
          {status === 'error' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200/80 text-sm text-red-700 flex items-center justify-center gap-2.5 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span>Verification link is invalid or expired.</span>
            </div>
          )}
        </div>

        <Link to="/dashboard" className="btn-primary mt-6 w-full py-3">
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
