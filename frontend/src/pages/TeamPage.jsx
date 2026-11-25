import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield, Crown, Users } from 'lucide-react';
import { api } from '../services/api';

const ROLE_BADGES = {
  org_owner: 'badge-indigo',
  org_admin: 'badge-amber',
  sales_manager: 'badge-emerald',
  sales_rep: 'badge-sky',
};

const ROLE_LABELS = {
  org_owner: 'Owner',
  org_admin: 'Admin',
  sales_manager: 'Manager',
  sales_rep: 'Sales Rep',
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales_rep');

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: async () => (await api.get('/organizations/members')).data.data,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/organizations/members/invite', { name, email, role }),
    onSuccess: () => {
      setName('');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['org-members'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }) => api.patch(`/organizations/members/${id}`, { role: newRole }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/organizations/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Team Management</h1>
        <p className="section-subtitle">Invite sales managers and representatives with role-based permissions.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          inviteMutation.mutate();
        }}
        className="card p-6"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="font-semibold text-slate-900">Invite Team Member</h2>
        </div>
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
            <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Nair" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="sales_rep">Sales Representative</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="org_admin">Organization Admin</option>
            </select>
          </div>
          <button type="submit" disabled={inviteMutation.isPending} className="btn-primary">
            <UserPlus className="h-4 w-4" /> {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => {
              const initials = (m.userId?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{m.userId?.name}</p>
                        <p className="text-xs text-slate-500">{m.userId?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {m.role === 'org_owner' ? (
                      <span className="inline-flex items-center gap-1.5 badge-indigo">
                        <Crown className="h-3 w-3" /> Owner
                      </span>
                    ) : (
                      <select
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        value={m.role}
                        onChange={(e) => roleMutation.mutate({ id: m._id, newRole: e.target.value })}
                      >
                        <option value="org_admin">Organization Admin</option>
                        <option value="sales_manager">Sales Manager</option>
                        <option value="sales_rep">Sales Representative</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`badge text-[10px] capitalize ${
                      m.status === 'active' ? 'badge-emerald' : 'badge-amber'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {m.role !== 'org_owner' && (
                      <button
                        onClick={() => removeMutation.mutate(m._id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No team members yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
