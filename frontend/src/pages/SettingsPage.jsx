import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, Shield, AlertTriangle, Save, Globe } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [savedMsg, setSavedMsg] = useState('');

  const { data } = useQuery({
    queryKey: ['current-org'],
    queryFn: async () => (await api.get('/organizations/current')).data.data,
  });

  useEffect(() => {
    if (data?.organization) {
      setOrgName(data.organization.name || '');
      setTimezone(data.organization.timezone || 'Asia/Kolkata');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/organizations/current', { name: orgName, timezone }),
    onSuccess: () => {
      setSavedMsg('Organization settings saved.');
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => api.post('/auth/revoke-sessions'),
    onSuccess: () => {
      setSavedMsg('All active refresh sessions revoked.');
      setTimeout(() => setSavedMsg(''), 3000);
    },
  });

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle">Manage organization profile, compliance, and account security.</p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-sm text-emerald-700 flex items-center gap-2 animate-fade-in">
          <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Save className="h-3 w-3 text-emerald-600" />
          </div>
          {savedMsg}
        </div>
      )}

      {/* Organization Profile */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="card p-6 space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Organization Profile</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Organization Name</label>
            <input className="input-field" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Timezone
            </label>
            <input className="input-field" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Security */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Security & Sessions</h2>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-800 font-medium">Revoke All Sessions</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              This will invalidate all active refresh tokens across all devices. Everyone will need to log in again.
              Use this if you suspect unauthorized access.
            </p>
          </div>
        </div>
        <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} className="btn-danger">
          <Shield className="h-4 w-4" />
          {revokeMutation.isPending ? 'Revoking...' : 'Revoke All Sessions'}
        </button>
      </div>
    </div>
  );
}
