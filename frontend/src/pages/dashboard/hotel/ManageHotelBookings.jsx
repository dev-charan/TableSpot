import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Calendar, CheckCircle, XCircle, AlertTriangle,
  Clock, IndianRupee, Users, BedDouble, Phone, Mail,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

const STATUS_STYLES = {
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const STATUS_ACTIONS = {
  confirmed: [
    { label: 'Check Out', value: 'completed', icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' },
    { label: 'No Show', value: 'no_show', icon: AlertTriangle, color: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' },
    { label: 'Cancel', value: 'cancelled', icon: XCircle, color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  ],
  pending: [
    { label: 'Confirm', value: 'confirmed', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30' },
    { label: 'Cancel', value: 'cancelled', icon: XCircle, color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  ],
};

function BookingCard({ booking, onStatus, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
  const actions = STATUS_ACTIONS[booking.status] || [];
  const isToday = format(new Date(booking.check_in), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isDeparting = format(new Date(booking.check_out), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className={`card overflow-hidden transition-all ${isToday ? 'border border-green-500/30' : isDeparting ? 'border border-blue-500/30' : ''}`}>
      <div className="p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Guest info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                {booking.user_name?.[0]?.toUpperCase()}
              </div>
              <p className="font-semibold text-sm">{booking.user_name}</p>
              {isToday && <span className="badge bg-green-500/20 text-green-400 text-xs border border-green-500/20">Arriving Today</span>}
              {isDeparting && booking.status === 'confirmed' && <span className="badge bg-blue-500/20 text-blue-400 text-xs border border-blue-500/20">Departing Today</span>}
              <span className={`badge text-xs border capitalize ${STATUS_STYLES[booking.status] || ''}`}>
                {booking.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {format(new Date(booking.check_in), 'MMM d')} → {format(new Date(booking.check_out), 'MMM d, yyyy')}
                <span className="text-white/30">({nights} night{nights !== 1 ? 's' : ''})</span>
              </span>
              <span className="flex items-center gap-1"><BedDouble size={11} /> {booking.room_type_name}</span>
              <span className="flex items-center gap-1"><Users size={11} /> {booking.guests} guest{booking.guests > 1 ? 's' : ''}, {booking.rooms} room{booking.rooms > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Price + actions */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
            <div className="text-right">
              <p className="font-bold text-sm flex items-center gap-0.5 justify-end">
                <IndianRupee size={12} className="text-amber-400" />
                {Math.round(booking.total_price || 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/30">₹{Math.round((booking.price_per_night || 0)).toLocaleString()}/night</p>
            </div>

            {actions.length > 0 && (
              <div className="flex gap-1.5 flex-wrap justify-end">
                {actions.map(({ label, value, icon: Icon, color }) => (
                  <button key={value}
                    onClick={() => onStatus(booking.id, value)}
                    disabled={isPending}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${color}`}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less details' : 'More details'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-4 md:px-5 py-4 bg-dark-800/40 space-y-2 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-white/30 shrink-0" /> {booking.user_email}
            </div>
            {booking.user_phone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-white/30 shrink-0" /> {booking.user_phone}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-white/30 shrink-0" />
              Booked {format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30">Booking ID:</span>
              <span className="font-mono text-[10px]">{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          {booking.special_requests && (
            <div className="glass rounded-xl px-3 py-2 text-xs text-white/60 flex gap-2">
              <span className="text-white/30 shrink-0">Requests:</span>
              <span className="italic">{booking.special_requests}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageHotelBookings() {
  const { hotelId } = useOutletContext();
  const qc = useQueryClient();

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['hotel-bookings-manage', hotelId, status, from, to],
    queryFn: () => api.get(`/hotel-bookings/hotel/${hotelId}`, {
      params: { status: status || undefined, from: from || undefined, to: to || undefined },
    }).then((r) => r.data),
    enabled: !!hotelId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, s }) => api.patch(`/hotel-bookings/${id}/status`, { status: s }),
    onSuccess: (_, vars) => {
      const label = vars.s === 'completed' ? 'Checked out' : vars.s === 'no_show' ? 'Marked no-show' : vars.s === 'confirmed' ? 'Confirmed' : 'Cancelled';
      toast.success(label);
      qc.invalidateQueries(['hotel-bookings-manage']);
      qc.invalidateQueries(['hotel-stats']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.user_name?.toLowerCase().includes(q) || b.user_email?.toLowerCase().includes(q) || b.room_type_name?.toLowerCase().includes(q);
  });

  const arrivingToday = bookings.filter((b) =>
    format(new Date(b.check_in), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && ['confirmed', 'pending'].includes(b.status)
  ).length;

  const departingToday = bookings.filter((b) =>
    format(new Date(b.check_out), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && b.status === 'confirmed'
  ).length;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hotel Bookings</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Today's summary */}
      {(arrivingToday > 0 || departingToday > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {arrivingToday > 0 && (
            <div className="glass rounded-2xl p-4 border border-green-500/20 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-400">{arrivingToday}</p>
                <p className="text-xs text-white/50">Arriving today</p>
              </div>
            </div>
          )}
          {departingToday > 0 && (
            <div className="glass rounded-2xl p-4 border border-blue-500/20 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-400">{departingToday}</p>
                <p className="text-xs text-white/50">Departing today</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm w-full" placeholder="Search by guest, email or room type..." />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm glass transition-all ${showFilters ? 'text-blue-400 border border-blue-500/30' : 'text-white/50 hover:text-white'}`}>
            <Filter size={14} /> Filters {(from || to) && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="glass rounded-xl p-4 space-y-3 animate-fade-in border border-white/5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Check-in from</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Check-in to</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input text-sm" />
              </div>
            </div>
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Clear date filter
              </button>
            )}
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {['', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                status === s ? 'bg-blue-500 text-white' : 'glass text-white/50 hover:text-white'
              }`}>
              {s ? s.replace('_', ' ') : 'All'}
              {s === '' && bookings.length > 0 && <span className="ml-1 text-white/30">{bookings.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Booking list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-dark-700 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏨</p>
          <p className="text-white/40 text-sm">No bookings found</p>
          {(status || search || from || to) && (
            <button onClick={() => { setStatus(''); setSearch(''); setFrom(''); setTo(''); }}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onStatus={(id, s) => statusMutation.mutate({ id, s })}
              isPending={statusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
