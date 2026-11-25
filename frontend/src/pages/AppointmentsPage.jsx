import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, XCircle, Plus, ExternalLink, Clock, Video } from 'lucide-react';
import { api } from '../services/api';

const STATUS_BADGE = {
  scheduled: 'badge-indigo',
  confirmed: 'badge-emerald',
  canceled: 'badge-red',
  completed: 'badge-slate',
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [showBook, setShowBook] = useState(false);
  const [form, setForm] = useState({
    leadId: '',
    title: 'Product Demo',
    attendeeName: '',
    attendeeEmail: '',
    startTime: '',
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get('/appointments')).data.data,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => (await api.get('/leads')).data.data,
  });

  const bookMutation = useMutation({
    mutationFn: (payload) => api.post('/appointments', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setShowBook(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/appointments/${id}/cancel`, { reason: 'Canceled from dashboard' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Appointments</h1>
          <p className="section-subtitle">Manage AI-booked demos and Google Calendar meetings.</p>
        </div>
        <button onClick={() => setShowBook(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Book Appointment
        </button>
      </div>

      <div className="card divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <CalendarDays className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">No appointments scheduled yet.</p>
            <button onClick={() => setShowBook(true)} className="btn-primary mt-4 text-sm">
              <Plus className="h-3.5 w-3.5" /> Book First Appointment
            </button>
          </div>
        ) : (
          appointments.map((appt, idx) => (
            <div
              key={appt._id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">
                    {new Date(appt.startTime).toLocaleDateString('en', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-indigo-700 -mt-0.5">
                    {new Date(appt.startTime).getDate()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{appt.title}</h3>
                    <span className={`${STATUS_BADGE[appt.status] || 'badge-slate'} text-[10px] capitalize`}>
                      {appt.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {appt.attendeeName} ({appt.attendeeEmail})
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(appt.startTime).toLocaleString()} ({appt.timezone})
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {appt.meetingLink && (
                  <a
                    href={appt.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs"
                  >
                    <Video className="h-3.5 w-3.5" /> Join
                  </a>
                )}
                {appt.status !== 'canceled' && (
                  <button
                    onClick={() => cancelMutation.mutate(appt._id)}
                    className="btn-danger text-xs"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showBook && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowBook(false)}>
          <div className="modal-content">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Book Appointment</h2>
                <p className="text-xs text-slate-500">Schedule a meeting via Google Calendar</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                bookMutation.mutate({
                  ...form,
                  leadId: form.leadId || leads[0]?._id,
                });
              }}
              className="space-y-3"
            >
              <select
                required
                className="input-field"
                value={form.leadId}
                onChange={(e) => {
                  const l = leads.find((x) => x._id === e.target.value);
                  setForm({
                    ...form,
                    leadId: e.target.value,
                    attendeeName: l?.name || form.attendeeName,
                    attendeeEmail: l?.email || form.attendeeEmail,
                  });
                }}
              >
                <option value="">Select Lead</option>
                {leads.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
              <input required className="input-field" placeholder="Meeting Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input required className="input-field" placeholder="Attendee Name" value={form.attendeeName} onChange={(e) => setForm({ ...form, attendeeName: e.target.value })} />
              <input required type="email" className="input-field" placeholder="Attendee Email" value={form.attendeeEmail} onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })} />
              <input required type="datetime-local" className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowBook(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
