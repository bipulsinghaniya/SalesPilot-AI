import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Power, Trash2, Volume2, Sparkles } from 'lucide-react';
import { api } from '../services/api';

const EMPTY_FORM = {
  name: '',
  companyName: '',
  personality: 'consultative',
  preferredLanguage: 'en',
  productDescription: '',
  salesObjectives: 'Qualify prospects, answer questions accurately, and schedule product demos.',
  welcomeMessage: 'Hello! Thanks for reaching out. How can I help you today?',
  salesInstructions: '',
  voiceId: '21m00Tcm4TlvDq8ikWAM',
};

const PERSONALITY_BADGES = {
  consultative: 'badge-indigo',
  professional: 'badge-slate',
  friendly: 'badge-emerald',
  persuasive: 'badge-amber',
  informative: 'badge-sky',
};

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await api.get('/agents')).data.data,
  });

  const { data: voices = [] } = useQuery({
    queryKey: ['voices'],
    queryFn: async () => (await api.get('/agents/voices')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/agents', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/agents/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/agents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      companyName: form.companyName,
      personality: form.personality,
      preferredLanguage: form.preferredLanguage,
      productDescription: form.productDescription,
      salesObjectives: form.salesObjectives,
      welcomeMessage: form.welcomeMessage,
      salesInstructions: form.salesInstructions,
      voiceConfig: { voiceId: form.voiceId },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">AI Sales Agents</h1>
          <p className="section-subtitle">Configure autonomous voice & text agents for your organization.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Create Agent
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <Bot className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-lg text-slate-900">No AI agents configured</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Create your first AI sales agent to start handling voice & text leads.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Create Agent
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent, idx) => (
            <div
              key={agent._id}
              className="card-hover p-6 flex flex-col justify-between animate-slide-up"
              style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-100">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`${PERSONALITY_BADGES[agent.personality] || 'badge-slate'} text-[10px]`}>
                          {agent.personality}
                        </span>
                        <span className="text-[10px] text-slate-400">{agent.preferredLanguage.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        agent.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {agent.isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />}
                      {agent.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {agent.productDescription || agent.salesObjectives}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Voice: {agent.voiceConfig?.voiceName || agent.voiceConfig?.voiceId?.slice(0, 8) || 'Default'}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => toggleMutation.mutate({ id: agent._id, isActive: !agent.isActive })}
                  className="btn-ghost text-xs"
                >
                  <Power className="h-3.5 w-3.5" />
                  {agent.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(agent._id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete agent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create AI Sales Agent</h2>
                <p className="text-xs text-slate-500">Configure personality, language, and voice</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Agent Name</label>
                  <input
                    required
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Aria"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    required
                    className="input-field"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Personality</label>
                  <select
                    className="input-field"
                    value={form.personality}
                    onChange={(e) => setForm({ ...form, personality: e.target.value })}
                  >
                    <option value="consultative">Consultative</option>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="persuasive">Persuasive</option>
                    <option value="informative">Informative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Language</label>
                  <select
                    className="input-field"
                    value={form.preferredLanguage}
                    onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Voice</label>
                  <select
                    className="input-field"
                    value={form.voiceId}
                    onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                  >
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
                  value={form.productDescription}
                  onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
                  placeholder="Describe your product, target audience, and key value..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Welcome Message</label>
                <input
                  className="input-field"
                  value={form.welcomeMessage}
                  onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sales Instructions</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
                  value={form.salesInstructions}
                  onChange={(e) => setForm({ ...form, salesInstructions: e.target.value })}
                  placeholder="Qualification rules, objection handling notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
