import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, UtensilsCrossed, Building2, Calendar, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/axios';

const statusBadge = {
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  no_show: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function AdminBookings() {
  const [searchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get('type') || 'restaurant');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: restData, isLoading: restLoading } = useQuery({
    queryKey: ['admin-bookings', search, status, page],
    queryFn: () => api.get('/admin/bookings', { params: { search, status, page } }).then((r) => r.data),
    enabled: type === 'restaurant',
  });

  const { data: hotelData, isLoading: hotelLoading } = useQuery({
    queryKey: ['admin-hotel-bookings', search, status, page],
    queryFn: () => api.get('/admin/hotel-bookings', { params: { search, status, page } }).then((r) => r.data),
    enabled: type === 'hotel',
  });

  const data = type === 'restaurant' ? restData : hotelData;
  const isLoading = type === 'restaurant' ? restLoading : hotelLoading;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <p className="text-white/40 text-sm mt-1">{data?.total || 0} records</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 glass rounded-xl p-1">
            <button onClick={() => { setType('restaurant'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${type === 'restaurant' ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'}`}>
              <UtensilsCrossed size={13} /> Restaurants
            </button>
            <button onClick={() => { setType('hotel'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${type === 'hotel' ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white'}`}>
              <Building2 size={13} /> Hotels
            </button>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9 text-sm w-full" placeholder="Search by user or name..." />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${status === s ? 'bg-violet-500 text-white' : 'glass text-white/50 hover:text-white'}`}>
              {s.replace('_', ' ') || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead className="border-b border-white/5">
            <tr className="text-xs text-white/40 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">{type === 'restaurant' ? 'Restaurant' : 'Hotel'}</th>
              <th className="px-5 py-3 text-left hidden md:table-cell">{type === 'restaurant' ? 'Date & Time' : 'Check-in / out'}</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">Details</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-dark-600 rounded animate-pulse" /></td></tr>
              ))
            ) : data?.bookings?.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-white/30">No bookings found</td></tr>
            ) : data?.bookings?.map((b) => (
              <tr key={b.id} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium">{b.user_name}</p>
                  <p className="text-xs text-white/40">{b.user_email}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium">{b.restaurant_name || b.hotel_name}</p>
                  <p className="text-xs text-white/40">{b.city}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  {type === 'restaurant' ? (
                    <div>
                      <p className="text-sm">{format(new Date(b.booking_date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-white/40">{b.time_slot}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm">{format(new Date(b.check_in), 'MMM d')} → {format(new Date(b.check_out), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-white/40">{b.room_type_name}</p>
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 hidden lg:table-cell text-xs text-white/40">
                  {type === 'restaurant' ? (
                    <span>{b.party_size} guests</span>
                  ) : (
                    <span>{b.guests} guests · {b.rooms} room{b.rooms > 1 ? 's' : ''} · ₹{Math.round(b.total_price || 0).toLocaleString()}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`badge text-xs border capitalize ${statusBadge[b.status] || ''}`}>
                    {b.status?.replace('_', ' ')}
                  </span>
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
