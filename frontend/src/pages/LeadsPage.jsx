import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Kanban, Table2, Users } from 'lucide-react';
import { api } from '../services/api';

const STAGES = ['new', 'contacted', 'qualified', 'demo_scheduled', 'negotiation', 'converted', 'lost'];

const STATUS_BADGE = {
  hot: 'badge-red',
  warm: 'badge-amber',
  cold: 'badge-sky',
};

const STAGE_COLORS = {
  new: 'bg-slate-100 border-slate-200',
  contacted: 'bg-sky-50 border-sky-200',
  qualified: 'bg-indigo-50 border-indigo-200',
  demo_scheduled: 'bg-violet-50 border-violet-200',
  negotiation: 'bg-amber-50 border-amber-200',
  converted: 'bg-emerald-50 border-emerald-200',
  lost: 'bg-red-50 border-red-200',
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('leadStatus', statusFilter);
      return (await api.get(`/leads?${params.toString()}`)).data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/leads', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', company: '' });
    },
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, pipelineStage }) => api.patch(`/leads/${id}`, { pipelineStage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Leads & CRM</h1>
          <p className="section-subtitle">Track AI-qualified leads, scores, sentiment, and pipeline stages.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === 'table' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                view === 'pipeline' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Pipeline
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="hot">🔥 Hot (80–100)</option>
          <option value="warm">⚡ Warm (50–79)</option>
          <option value="cold">❄️ Cold (0–49)</option>
        </select>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-sm text-slate-400">
          <div className="inline-block h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3">Loading leads...</p>
        </div>
      ) : view === 'table' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Sentiment</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link to={`/leads/${lead._id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                      {lead.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{lead.email || lead.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{lead.company || '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lead.leadScore >= 80 ? 'bg-red-500' : lead.leadScore >= 50 ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${lead.leadScore}%` }}
                        />
                      </div>
                      <span className={`${STATUS_BADGE[lead.leadStatus] || 'badge-slate'} text-[10px]`}>
                        {lead.leadScore} · {lead.leadStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white capitalize focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      value={lead.pipelineStage}
                      onChange={(e) => stageMutation.mutate({ id: lead._id, pipelineStage: e.target.value })}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 capitalize text-slate-600">{lead.sentiment?.overall || 'unknown'}</td>
                  <td className="px-4 py-3.5 capitalize text-slate-500 text-xs">{lead.source?.replace('_', ' ')}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No leads found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.pipelineStage === stage);
            return (
              <div key={stage} className={`rounded-xl p-3 min-w-[220px] flex-shrink-0 border ${STAGE_COLORS[stage] || 'bg-slate-100 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-600 tracking-wide">
                    {stage.replace('_', ' ')}
                  </span>
                  <span className="badge-slate text-[10px]">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.map((l) => (
                    <Link key={l._id} to={`/leads/${l._id}`} className="block card p-3 hover:border-indigo-300 transition-colors">
                      <p className="font-medium text-sm text-slate-900 truncate">{l.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{l.company || l.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              l.leadScore >= 80 ? 'bg-red-500' : l.leadScore >= 50 ? 'bg-amber-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${l.leadScore}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600">{l.leadScore}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-content">
            <h2 className="text-lg font-bold text-slate-900">Add New Lead</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter lead contact details</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="mt-5 space-y-3"
            >
              <input required className="input-field" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input type="email" className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="input-field" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Save Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
