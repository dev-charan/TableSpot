import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UtensilsCrossed, Building2, Star, Eye, EyeOff, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const Stars = ({ rating }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`text-sm ${n <= rating ? 'text-amber-400' : 'text-white/20'}`}>★</span>
    ))}
  </div>
);

export default function AdminReviews() {
  const qc = useQueryClient();
  const [type, setType] = useState('restaurant');
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', type, search, visibility, page],
    queryFn: () => api.get('/admin/reviews', { params: { type, search, visibility, page } }).then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/reviews/${id}/visibility?type=${type}`),
    onSuccess: () => { toast.success('Visibility updated'); qc.invalidateQueries(['admin-reviews']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/reviews/${id}?type=${type}`),
    onSuccess: () => { toast.success('Review deleted'); qc.invalidateQueries(['admin-reviews']); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const switchType = (t) => { setType(t); setPage(1); setSearch(''); setVisibility(''); };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-white/40 text-sm mt-1">{data?.total || 0} reviews</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex gap-1 glass rounded-xl p-1">
          <button onClick={() => switchType('restaurant')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${type === 'restaurant' ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'}`}>
            <UtensilsCrossed size={13} /> Restaurants
          </button>
          <button onClick={() => switchType('hotel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${type === 'hotel' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white'}`}>
            <Building2 size={13} /> Hotels
          </button>
        </div>

        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 text-sm w-full" placeholder="Search by user or name..." />
        </div>

        <div className="flex gap-2">
          {[
            { val: '', label: 'All' },
            { val: 'visible', label: 'Visible' },
            { val: 'hidden', label: 'Hidden' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => { setVisibility(val); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${visibility === val ? 'bg-violet-500 text-white' : 'glass text-white/50 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {deleteTarget && (
        <div className="glass rounded-2xl p-5 border border-red-500/30 flex items-center gap-4">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm flex-1">Delete this review permanently? This will recalculate the rating.</p>
          <div className="flex gap-2">
            <button onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending}
              className="text-xs bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            <button onClick={() => setDeleteTarget(null)} className="text-xs glass px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-28 bg-dark-700 rounded-2xl animate-pulse" />)
        ) : data?.reviews?.length === 0 ? (
          <div className="text-center py-16 text-white/30">No reviews found</div>
        ) : data?.reviews?.map((rv) => (
          <div key={rv.id} className={`card p-5 transition-all ${!rv.is_visible ? 'opacity-50 border border-red-500/20' : ''}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${type === 'restaurant' ? 'bg-brand-500/20 text-brand-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {rv.user_name?.[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{rv.user_name}</span>
                  <span className="text-white/30 text-xs">reviewed</span>
                  <Link
                    to={`/${type === 'restaurant' ? 'restaurant' : 'hotel'}/${rv.entity_id}`}
                    target="_blank"
                    className={`text-sm font-medium flex items-center gap-1 hover:underline ${type === 'restaurant' ? 'text-brand-400' : 'text-blue-400'}`}
                  >
                    {rv.entity_name} <ExternalLink size={11} />
                  </Link>
                  {!rv.is_visible && (
                    <span className="badge bg-red-500/10 text-red-400 border border-red-500/20 text-xs">Hidden</span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <Stars rating={rv.rating} />
                  {rv.room_type_name && (
                    <span className="text-xs text-white/40">· {rv.room_type_name}</span>
                  )}
                  <span className="text-xs text-white/30">{format(new Date(rv.created_at), 'MMM d, yyyy')}</span>
                </div>

                {rv.comment ? (
                  <p className="text-sm text-white/70 leading-relaxed">{rv.comment}</p>
                ) : (
                  <p className="text-xs text-white/30 italic">No comment</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate(rv.id)}
                  disabled={toggleMutation.isPending}
                  title={rv.is_visible ? 'Hide review' : 'Show review'}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    rv.is_visible
                      ? 'glass text-green-400 hover:bg-green-500/10'
                      : 'glass text-white/30 hover:text-green-400'
                  }`}
                >
                  {rv.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => setDeleteTarget(rv.id)}
                  className="w-9 h-9 glass rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
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
