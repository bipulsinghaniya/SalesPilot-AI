import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneCall, Radio, PhoneOutgoing, Mic } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

export default function LiveCallsPage() {
  const qc = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentId, setAgentId] = useState('');
  const [liveFeed, setLiveFeed] = useState([]);

  const { data: activeCalls = [] } = useQuery({
    queryKey: ['live-calls'],
    queryFn: async () => (await api.get('/calls/live')).data.data,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await api.get('/agents')).data.data,
  });

  useSocket({
    'call:connected': () => qc.invalidateQueries({ queryKey: ['live-calls'] }),
    'call:ended': () => qc.invalidateQueries({ queryKey: ['live-calls'] }),
    'transcript:update': (evt) => {
      setLiveFeed((prev) => [evt, ...prev].slice(0, 25));
    },
  });

  const outboundMutation = useMutation({
    mutationFn: () =>
      api.post('/calls/outbound', {
        agentId: agentId || agents[0]?._id,
        phoneNumber,
        provider: 'twilio',
      }),
    onSuccess: () => {
      setPhoneNumber('');
      qc.invalidateQueries({ queryKey: ['live-calls'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Live Calls</h1>
          <p className="section-subtitle">Monitor active voice sessions and initiate outbound AI sales calls.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field w-40"
            value={agentId || agents[0]?._id || ''}
            onChange={(e) => setAgentId(e.target.value)}
          >
            {agents.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
          <input
            className="input-field w-44"
            placeholder="+919876543210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button
            onClick={() => outboundMutation.mutate()}
            disabled={!phoneNumber || outboundMutation.isPending}
            className="btn-primary shrink-0"
          >
            <PhoneOutgoing className="h-4 w-4" /> Call
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Calls */}
        <div className="card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Radio className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Active Calls</h2>
            {activeCalls.length > 0 && (
              <span className="badge-emerald text-[10px]">{activeCalls.length} live</span>
            )}
          </div>
          {activeCalls.length === 0 ? (
            <div className="py-12 text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                <PhoneCall className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">No active calls right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCalls.map((call) => (
                <div key={call._id} className="p-4 rounded-xl border border-emerald-200/60 bg-emerald-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center ring-2 ring-emerald-400/30">
                      <Mic className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {call.leadId?.name || call.customerPhone || 'Browser Voice Session'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Agent: {call.agentId?.name} · {call.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-end gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-emerald-500 rounded-full"
                          style={{
                            height: `${8 + Math.random() * 10}px`,
                            animation: `voice-wave 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="badge-emerald text-[10px] capitalize">
                      {call.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Transcript */}
        <div className="card p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <PhoneCall className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Real-Time Transcript</h2>
          </div>
          {liveFeed.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">
                Live speech transcripts will appear here during active calls.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {liveFeed.map((item, idx) => (
                <div
                  key={idx}
                  className={`text-sm p-3 rounded-xl border animate-fade-in ${
                    item.speaker === 'agent'
                      ? 'bg-indigo-50/50 border-indigo-200/40'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className={`font-bold uppercase text-[10px] tracking-wider mr-2 ${
                    item.speaker === 'agent' ? 'text-indigo-600' : 'text-slate-500'
                  }`}>
                    {item.speaker}:
                  </span>
                  <span className="text-slate-700">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
