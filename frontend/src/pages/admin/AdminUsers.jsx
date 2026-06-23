import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, Edit3, Trash2, Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const roleBadge = {
  user: 'bg-white/10 text-white/60',
  restaurant_owner: 'bg-brand-500/20 text-brand-400',
  hotel_owner: 'bg-blue-500/20 text-blue-400',
  admin: 'bg-violet-500/20 text-violet-400',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () => api.get('/admin/users', { params: { search, role, page } }).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries(['admin-users']); setEditId(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['admin-users']); setDeleteId(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-white/40 text-sm mt-1">{data?.total || 0} total users</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 text-sm w-full" placeholder="Search by name or email..." />
        </div>
        <div className="relative">
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="input text-sm pr-8 appearance-none w-full sm:w-auto">
            <option value="">All Roles</option>
            <option value="user">Diner</option>
            <option value="restaurant_owner">Restaurant Owner</option>
            <option value="hotel_owner">Hotel Owner</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        </div>
      </div>

      {deleteId && (
        <div className="glass rounded-2xl p-5 border border-red-500/30 flex items-center gap-4">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm flex-1">Are you sure you want to delete this user? This action cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
              className="text-xs bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            <button onClick={() => setDeleteId(null)} className="text-xs glass px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead className="border-b border-white/5">
            <tr className="text-xs text-white/40 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left hidden md:table-cell">Joined</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">No-shows</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-dark-600 rounded animate-pulse" /></td></tr>
              ))
            ) : data?.users?.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-white/30">No users found</td></tr>
            ) : data?.users?.map((user) => (
              <tr key={user.id} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {editId === user.id ? (
                    <div className="flex items-center gap-2">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                        className="bg-dark-600 text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none">
                        <option value="user">Diner</option>
                        <option value="restaurant_owner">Restaurant Owner</option>
                        <option value="hotel_owner">Hotel Owner</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => updateMutation.mutate({ id: user.id, role: editRole })} className="text-green-400 hover:opacity-80"><Check size={14} /></button>
                      <button onClick={() => setEditId(null)} className="text-red-400 hover:opacity-80"><X size={14} /></button>
                    </div>
                  ) : (
                    <span className={`badge text-xs capitalize ${roleBadge[user.role] || 'bg-white/10 text-white/60'}`}>
                      {user.role === 'restaurant_owner' ? 'Restaurant' : user.role === 'hotel_owner' ? 'Hotel' : user.role}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-xs text-white/40">{format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  {user.no_show_count > 0 ? (
                    <span className="badge bg-orange-500/10 text-orange-400 text-xs">{user.no_show_count} no-show{user.no_show_count > 1 ? 's' : ''}</span>
                  ) : (
                    <span className="text-xs text-white/20">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditId(user.id); setEditRole(user.role); }}
                      className="text-white/30 hover:text-white transition-colors" title="Change role">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(user.id)}
                      className="text-red-400/40 hover:text-red-400 transition-colors" title="Delete user">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(data.pages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === i + 1 ? 'bg-violet-500 text-white' : 'glass glass-hover text-white/60'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
