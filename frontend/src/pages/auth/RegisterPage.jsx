import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, User, Building2, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

const schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  organizationName: z.string().min(2, 'Organization name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function RegisterPage() {
  const [serverError, setServerError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = await api.post('/auth/register', values);
      setAuth(res.data.data);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[420px] h-[420px] bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[420px] h-[420px] bg-violet-200/40 rounded-full blur-3xl" />
      </div>

      <div className="card relative z-10 w-full max-w-md p-8 shadow-xl shadow-slate-200/60 animate-slide-up">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-7 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">SalesPilot AI</span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your organization</h1>
        <p className="mt-1 text-sm text-slate-500">Set up your multi-tenant AI sales workspace in seconds.</p>

        {serverError && (
          <div className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-sm text-red-700 flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input className="input-field pl-10" placeholder="Aarav Sharma" {...register('name')} />
            </div>
            {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization Name</label>
            <div className="relative">
              <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input className="input-field pl-10" placeholder="Acme Cloud Pvt Ltd" {...register('organizationName')} />
            </div>
            {errors.organizationName && <p className="mt-1.5 text-xs text-red-600">{errors.organizationName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="email" className="input-field pl-10" placeholder="aarav@acme.com" {...register('email')} />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="password" className="input-field pl-10" placeholder="Min. 8 characters" {...register('password')} />
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-2">
            {isSubmitting ? 'Creating workspace...' : (
              <>
                Create Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
