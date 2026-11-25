import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Sparkles, Timer, PhoneCall, CalendarCheck2, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data } = useQuery({
    queryKey: ['analytics-overview', days],
    queryFn: async () => (await api.get(`/analytics/overview?days=${days}`)).data.data,
  });

  const { data: insights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: async () => (await api.get('/analytics/insights')).data.data,
  });

  const metrics = data?.historicalMetrics || {};

  const kpis = [
    { label: 'Avg Call Duration', value: `${metrics.avgCallDurationSec ?? 0}s`, icon: Timer, color: 'bg-violet-50 text-violet-600' },
    { label: 'Successful Calls', value: metrics.successfulCalls ?? 0, icon: PhoneCall, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Follow-ups', value: metrics.pendingFollowUps ?? 0, icon: CalendarCheck2, color: 'bg-amber-50 text-amber-600' },
    { label: 'Converted Deals', value: metrics.convertedLeads ?? 0, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Sales Analytics & Intelligence</h1>
          <p className="section-subtitle">Historical performance metrics paired with AI-generated strategic insights.</p>
        </div>
        <select
          className="input-field w-40"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }, idx) => (
          <div
            key={label}
            className="kpi-card animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Pipeline Stage Performance</h2>
          <p className="text-xs text-slate-500 mb-5">Lead distribution across pipeline stages</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.pipelinePerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Customer Sentiment Distribution</h2>
          <p className="text-xs text-slate-500 mb-5">Breakdown of sentiment across all interactions</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.sentimentDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  strokeWidth={2}
                  stroke="#fff"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(data?.sentimentDistribution || []).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">AI-Generated Sales Recommendations</h2>
            <p className="text-[11px] text-slate-500">Strategic insights based on your data</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {(insights?.insights || []).length === 0 ? (
            <p className="text-sm text-slate-400 py-4 col-span-2 text-center">AI recommendations will appear as data accumulates.</p>
          ) : (
            (insights?.insights || []).map((ins, i) => (
              <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/60 hover:border-indigo-200 transition-colors">
                <p className="font-medium text-sm text-slate-900">{ins.title}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.detail}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
