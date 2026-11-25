import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquareText, PhoneCall, CalendarDays, Send, Target, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

const SENTIMENT_COLORS = {
  positive: 'text-emerald-600 bg-emerald-50',
  negative: 'text-red-600 bg-red-50',
  neutral: 'text-slate-600 bg-slate-100',
};

const INTEREST_BAR = {
  high: 'w-5/6 bg-emerald-500',
  medium: 'w-3/6 bg-amber-500',
  low: 'w-1/6 bg-red-500',
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => (await api.get(`/leads/${id}`)).data.data,
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.post(`/leads/${id}/notes`, { content: note }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['lead-detail', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="inline-block h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-500">Loading lead profile...</p>
      </div>
    );
  }
  if (!data?.lead) return <div className="card p-8 text-sm text-slate-500">Lead not found.</div>;

  const { lead, conversations, calls, appointments } = data;
  const scoreColor = lead.leadScore >= 80 ? 'text-red-600' : lead.leadScore >= 50 ? 'text-amber-600' : 'text-sky-600';
  const scoreBg = lead.leadScore >= 80 ? 'from-red-500 to-rose-500' : lead.leadScore >= 50 ? 'from-amber-500 to-orange-500' : 'from-sky-500 to-blue-500';

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Leads
      </Link>

      {/* Profile Header */}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${scoreBg} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
            {lead.name?.charAt(0)?.toUpperCase() || 'L'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {lead.company || 'No company'} · {lead.email || 'No email'} · {lead.phone || 'No phone'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lead Score</p>
            <p className={`text-3xl font-extrabold ${scoreColor}`}>{lead.leadScore}<span className="text-base font-normal text-slate-400">/100</span></p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase ${
            lead.leadStatus === 'hot' ? 'badge-red' : lead.leadStatus === 'warm' ? 'badge-amber' : 'badge-sky'
          }`}>
            {lead.leadStatus}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Qualification Factors */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Target className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Qualification & Sentiment</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Interest', value: lead.qualificationFactors?.interest || 'unknown' },
              { label: 'Budget Fit', value: lead.qualificationFactors?.budgetFit || 'unknown' },
              { label: 'Timeline', value: lead.qualificationFactors?.purchaseTimeline?.replace(/_/g, ' ') || 'unknown' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium capitalize text-slate-900">{value}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${INTEREST_BAR[value] || 'w-2/6 bg-slate-300'}`} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sentiment</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize ${SENTIMENT_COLORS[lead.sentiment?.overall] || SENTIMENT_COLORS.neutral}`}>
                  {lead.sentiment?.overall || 'unknown'}
                </span>
              </div>
            </div>
            {lead.qualificationFactors?.recommendedAction && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="font-semibold text-indigo-600 capitalize">
                    {lead.qualificationFactors.recommendedAction.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6 lg:col-span-2 flex flex-col">
          <h2 className="font-semibold text-slate-900 mb-4">Sales & AI Notes</h2>
          <div className="flex-1 space-y-2 max-h-56 overflow-y-auto mb-4">
            {(lead.notes || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No notes yet. Add one below.</p>
            ) : (
              lead.notes.map((n) => (
                <div key={n._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <p className="text-slate-800 leading-relaxed">{n.content}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) addNoteMutation.mutate();
            }}
            className="flex gap-2"
          >
            <input
              className="input-field"
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" disabled={!note.trim()} className="btn-primary shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Activity Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            icon: MessageSquareText,
            color: 'bg-indigo-50 text-indigo-600',
            title: 'Conversations',
            count: conversations.length,
            detail: conversations.length ? `Last active ${new Date(conversations[0].lastMessageAt).toLocaleDateString()}` : 'None',
          },
          {
            icon: PhoneCall,
            color: 'bg-emerald-50 text-emerald-600',
            title: 'Calls',
            count: calls.length,
            detail: calls.length ? `Last call ${calls[0].durationSec}s (${calls[0].status})` : 'None',
          },
          {
            icon: CalendarDays,
            color: 'bg-sky-50 text-sky-600',
            title: 'Appointments',
            count: appointments.length,
            detail: appointments.length ? new Date(appointments[0].startTime).toLocaleString() : 'None',
          },
        ].map(({ icon: Icon, color, title, count, detail }) => (
          <div key={title} className="card-hover p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{title} ({count})</h3>
                <p className="text-xs text-slate-500">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
