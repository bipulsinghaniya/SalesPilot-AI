import { useQuery } from '@tanstack/react-query';
import {
  Users,
  PhoneCall,
  CalendarCheck2,
  TrendingUp,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';

export default function DashboardPage() {
  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ['analytics-overview', 30],
    queryFn: async () => (await api.get('/analytics/overview?days=30')).data.data,
  });

  const { data: insightsRes } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: async () => (await api.get('/analytics/insights')).data.data,
  });

  const { data: appointmentsRes } = useQuery({
    queryKey: ['appointments-upcoming'],
    queryFn: async () => (await api.get('/appointments?status=scheduled')).data.data,
  });

  const metrics = analyticsRes?.historicalMetrics || {};
  const trends = analyticsRes?.trends || [];

  const kpis = [
    { label: 'Total Leads', value: metrics.totalLeads ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-600/10' },
    { label: 'Hot Leads', value: metrics.hotLeads ?? 0, icon: Flame, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-600/10' },
    { label: 'Total Calls', value: metrics.totalCalls ?? 0, icon: PhoneCall, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-600/10' },
    { label: 'Appointments', value: metrics.appointmentsBooked ?? 0, icon: CalendarCheck2, color: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-600/10' },
    { label: 'Conversion Rate', value: `${metrics.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-600/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Overview</h1>
        <p className="section-subtitle">Real-time sales pipeline, voice & text activity, and AI recommendations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, ring }, idx) => (
          <div
            key={label}
            className="kpi-card animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${bg} ${color} ring-1 ${ring}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {isLoading ? (
                <span className="inline-block h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
              ) : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Sales Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Leads and calls over the last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Leads
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Calls
              </span>
            </div>
          </div>
          <div className="h-64">
            {trends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-slate-400">
                <BarChartPlaceholder />
                <p className="mt-3">No activity recorded yet. Start a conversation to see trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '13px',
                    }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#4f46e5" fill="url(#leadGrad)" strokeWidth={2} name="Leads" />
                  <Area type="monotone" dataKey="calls" stroke="#10b981" fill="url(#callGrad)" strokeWidth={2} name="Calls" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Business Insights */}
        <div className="card p-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">AI Insights</h2>
              <p className="text-[11px] text-slate-500">AI-generated recommendations</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(insightsRes?.insights || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">AI insights will appear as data accumulates.</p>
            ) : (
              (insightsRes?.insights || []).map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/60">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center">
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Upcoming Appointments</h2>
        </div>
        {!appointmentsRes?.length ? (
          <p className="text-sm text-slate-400 py-4">No upcoming appointments scheduled.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointmentsRes.slice(0, 5).map((appt) => (
              <div key={appt._id} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-slate-900">{appt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {appt.attendeeName} ({appt.attendeeEmail})
                  </p>
                </div>
                <span className="badge-indigo text-[11px]">
                  {new Date(appt.startTime).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BarChartPlaceholder() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" fill="none" className="text-slate-200">
      <rect x="5" y="30" width="12" height="30" rx="3" fill="currentColor" />
      <rect x="22" y="15" width="12" height="45" rx="3" fill="currentColor" />
      <rect x="39" y="25" width="12" height="35" rx="3" fill="currentColor" />
      <rect x="56" y="10" width="12" height="50" rx="3" fill="currentColor" />
      <rect x="73" y="20" width="12" height="40" rx="3" fill="currentColor" />
      <rect x="90" y="5" width="12" height="55" rx="3" fill="currentColor" />
      <rect x="107" y="22" width="12" height="38" rx="3" fill="currentColor" />
    </svg>
  );
}
