import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plug, XCircle, KeyRound, Zap } from 'lucide-react';
import { api } from '../services/api';

const PROVIDER_ICONS = {
  openai: '🤖',
  deepgram: '🎤',
  elevenlabs: '🔊',
  twilio: '📞',
  exotel: '📞',
  google_calendar: '📅',
  brevo: '✉️',
  cloudinary: '☁️',
};

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [apiKey, setApiKey] = useState('');

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => (await api.get('/integrations')).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, key }) => api.put(`/integrations/${provider}`, { apiKey: key }),
    onSuccess: () => {
      setEditing(null);
      setApiKey('');
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Integrations</h1>
        <p className="section-subtitle">
          Connect AI, Voice, Telephony, Google Calendar, and Email providers. Secrets are encrypted at rest.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((item, idx) => (
          <div
            key={item.provider}
            className="card-hover p-6 flex flex-col justify-between animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center text-xl ring-1 ring-slate-200/80">
                    {PROVIDER_ICONS[item.provider] || <Plug className="h-5 w-5 text-indigo-600" />}
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.label}</h3>
                </div>
                {item.connected ? (
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={`flex items-center gap-1.5 ${
                  item.connected
                    ? 'badge-emerald'
                    : 'badge-slate'
                } text-[10px]`}>
                  <Zap className="h-2.5 w-2.5" />
                  {item.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              {item.maskedPreview && (
                <p className="mt-2 text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{item.maskedPreview}</p>
              )}
            </div>

            <button
              onClick={() => setEditing(item)}
              className="btn-secondary mt-5 w-full text-xs"
            >
              <KeyRound className="h-3.5 w-3.5" /> Configure
            </button>
          </div>
        ))}
        {integrations.length === 0 && (
          <div className="col-span-full card p-16 text-center">
            <Plug className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No integrations configured yet.</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal-content">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl ring-1 ring-slate-200/80">
                {PROVIDER_ICONS[editing.provider] || <Plug className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configure {editing.label}</h2>
                <p className="text-xs text-slate-500">Your key is encrypted before storage</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ provider: editing.provider, key: apiKey });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">API Key / Secret</label>
                <input
                  required
                  type="password"
                  className="input-field font-mono"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter provider API key..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{saveMutation.isPending ? 'Saving...' : 'Save Encrypted Key'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
