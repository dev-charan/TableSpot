import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Star, MapPin, ExternalLink, CheckCircle, XCircle, PauseCircle, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const statusConfig = {
  active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle, label: 'Active' },
  pending: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: PauseCircle, label: 'Pending' },
  suspended: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, label: 'Suspended' },
};

const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));

export default function AdminHotels() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-hotels', search, status, page],
    queryFn: () => api.get('/admin/hotels', { params: { search, status, page } }).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, s }) => api.patch(`/admin/hotels/${id}/status`, { status: s }),
    onSuccess: (_, vars) => { toast.success(`Hotel ${vars.s}`); qc.invalidateQueries(['admin-hotels']); qc.invalidateQueries(['admin-stats']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/hotels/${id}`),
    onSuccess: () => { toast.success('Hotel deleted'); qc.invalidateQueries(['admin-hotels']); qc.invalidateQueries(['admin-stats']); setDeleteId(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hotels</h1>
          <p className="text-white/40 text-sm mt-1">{data?.total || 0} total</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 text-sm w-full" placeholder="Search by name or city..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'active', 'pending', 'suspended'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${status === s ? 'bg-violet-500 text-white' : 'glass text-white/50 hover:text-white'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {deleteId && (
        <div className="glass rounded-2xl p-5 border border-red-500/30 flex items-center gap-4">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm flex-1">Delete this hotel? All room types, bookings and reviews will be removed.</p>
          <div className="flex gap-2">
            <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
              className="text-xs bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            <button onClick={() => setDeleteId(null)} className="text-xs glass px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-24 bg-dark-700 rounded-2xl animate-pulse" />)
        ) : data?.hotels?.length === 0 ? (
          <div className="text-center py-16 text-white/30">No hotels found</div>
        ) : data?.hotels?.map((h) => {
          const cfg = statusConfig[h.status] || statusConfig.active;
          const StatusIcon = cfg.icon;
          return (
            <div key={h.id} className="card p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
                {h.cover_image ? (
                  <img src={h.cover_image} alt={h.name} className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl shrink-0">🏨</div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold truncate">{h.name}</p>
                    <span className="text-amber-400 text-xs">{stars(h.star_rating)}</span>
                    <span className={`badge text-xs border ${cfg.color}`}><StatusIcon size={10} /> {cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {h.city}</span>
                    <span className="flex items-center gap-1 capitalize">{h.hotel_type}</span>
                    <span className="flex items-center gap-1"><Star size={10} /> {parseFloat(h.avg_rating || 0).toFixed(1)} ({h.total_reviews})</span>
                    <span>{h.total_bookings} bookings</span>
                    <span className="text-white/20 hidden sm:inline">Owner: {h.owner_name}</span>
                  </div>
                  <p className="text-xs text-white/20 mt-1">Registered {format(new Date(h.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Link to={`/hotel/${h.id}`} target="_blank" className="w-8 h-8 glass rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors" title="View page">
                  <ExternalLink size={13} />
                </Link>
                {h.status !== 'active' && (
                  <button onClick={() => statusMutation.mutate({ id: h.id, s: 'active' })}
                    className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors">
                    Activate
                  </button>
                )}
                {h.status === 'active' && (
                  <button onClick={() => statusMutation.mutate({ id: h.id, s: 'suspended' })}
                    className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                    Suspend
                  </button>
                )}
                {h.status === 'pending' && (
                  <button onClick={() => statusMutation.mutate({ id: h.id, s: 'suspended' })}
                    className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors">
                    Reject
                  </button>
                )}
                <button onClick={() => setDeleteId(h.id)} className="w-8 h-8 glass rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
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
