import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, X, Star, CheckCircle, AlertTriangle, UtensilsCrossed, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const statusConfig = {
  confirmed: { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle, label: 'Confirmed' },
  pending: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock, label: 'Pending' },
  cancelled: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: X, label: 'Cancelled' },
  completed: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Star, label: 'Completed' },
  no_show: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: AlertTriangle, label: 'No Show' },
};

export default function UserDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('restaurants');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/mine').then((r) => r.data),
  });

  const { data: hotelBookings = [], isLoading: hotelLoading } = useQuery({
    queryKey: ['my-hotel-bookings'],
    queryFn: () => api.get('/hotel-bookings/mine').then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/bookings/${id}/cancel`),
    onSuccess: () => { toast.success('Booking cancelled'); qc.invalidateQueries(['my-bookings']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const cancelHotelMutation = useMutation({
    mutationFn: (id) => api.patch(`/hotel-bookings/${id}/cancel`),
    onSuccess: () => { toast.success('Booking cancelled'); qc.invalidateQueries(['my-hotel-bookings']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const upcoming = bookings.filter((b) => ['confirmed', 'pending'].includes(b.status));
  const past = bookings.filter((b) => ['completed', 'cancelled', 'no_show'].includes(b.status));
  const upcomingHotels = hotelBookings.filter((b) => ['confirmed', 'pending'].includes(b.status));
  const pastHotels = hotelBookings.filter((b) => ['completed', 'cancelled', 'no_show'].includes(b.status));

  const BookingCard = ({ booking }) => {
    const cfg = statusConfig[booking.status] || statusConfig.confirmed;
    const Icon = cfg.icon;
    const isPast = new Date(`${booking.booking_date}T${booking.time_slot}`) < new Date();

    return (
      <div className="card p-5 animate-slide-up">
        <div className="flex gap-4">
          {booking.cover_image ? (
            <img src={booking.cover_image} alt={booking.restaurant_name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 bg-brand-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">🍽️</div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link to={`/restaurant/${booking.restaurant_id}`} className="font-semibold hover:text-brand-400 transition-colors line-clamp-1">
                {booking.restaurant_name}
              </Link>
              <span className={`badge border ${cfg.color} shrink-0`}>
                <Icon size={10} /> {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <Calendar size={11} />
                {format(new Date(booking.booking_date), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} /> {booking.time_slot}
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={11} /> {booking.address?.split(',')[0]}
              </div>
            </div>

            {booking.table_number && (
              <p className="text-xs text-white/40 mt-1">
                Table {booking.table_number} • {booking.table_location}
              </p>
            )}
          </div>
        </div>

        {booking.special_requests && (
          <p className="mt-3 text-xs text-white/50 glass rounded-lg px-3 py-2">
            📝 {booking.special_requests}
          </p>
        )}

        <div className="mt-3 flex justify-end gap-2">
          {booking.status === 'confirmed' && !isPast && (
            <button
              onClick={() => cancelMutation.mutate(booking.id)}
              disabled={cancelMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Cancel
            </button>
          )}
          {booking.status === 'completed' && !booking.review_rating && (
            <Link to={`/restaurant/${booking.restaurant_id}#reviews`} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <Star size={12} /> Write Review
            </Link>
          )}
        </div>
      </div>
    );
  };

  const HotelBookingCard = ({ booking }) => {
    const cfg = statusConfig[booking.status] || statusConfig.confirmed;
    const Icon = cfg.icon;
    const isPast = new Date(booking.check_out) < new Date();
    const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));

    return (
      <div className="card p-5 animate-slide-up">
        <div className="flex gap-4">
          {booking.cover_image ? (
            <img src={booking.cover_image} alt={booking.hotel_name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">🏨</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link to={`/hotel/${booking.hotel_id}`} className="font-semibold hover:text-blue-400 transition-colors line-clamp-1">
                {booking.hotel_name}
              </Link>
              <span className={`badge border ${cfg.color} shrink-0`}><Icon size={10} /> {cfg.label}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-white/50">
              <div className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(booking.check_in), 'MMM d')} → {format(new Date(booking.check_out), 'MMM d, yyyy')}</div>
              <span>{nights} night{nights > 1 ? 's' : ''}</span>
              <span>{booking.room_type_name}</span>
            </div>
            <p className="text-xs text-white/40 mt-1">{booking.guests} guest{booking.guests > 1 ? 's' : ''} • ₹{Math.round(booking.total_price || 0).toLocaleString()} total</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {booking.status === 'confirmed' && !isPast && (
            <button onClick={() => cancelHotelMutation.mutate(booking.id)} disabled={cancelHotelMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
              <X size={12} /> Cancel
            </button>
          )}
          {booking.status === 'completed' && !booking.review_rating && (
            <Link to={`/hotel/${booking.hotel_id}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <Star size={12} /> Write Review
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      <div className="flex gap-2 mb-8">
        {[
          { key: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed, count: bookings.length },
          { key: 'hotels', label: 'Hotels', icon: Building2, count: hotelBookings.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === key ? 'bg-brand-500 text-white' : 'glass text-white/60 hover:text-white'
            }`}>
            <Icon size={14} /> {label}
            {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white/20' : 'bg-white/10'}`}>{count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'restaurants' && (
        isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-dark-700 rounded-2xl animate-pulse" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-white/60 mb-4">No restaurant bookings yet</p>
            <Link to="/" className="btn-primary text-sm">Explore Restaurants</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Upcoming</h2>
                <div className="space-y-3">{upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Past</h2>
                <div className="space-y-3">{past.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'hotels' && (
        hotelLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-dark-700 rounded-2xl animate-pulse" />)}</div>
        ) : hotelBookings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏨</p>
            <p className="text-white/60 mb-4">No hotel bookings yet</p>
            <Link to="/hotels" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">Explore Hotels</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcomingHotels.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Upcoming</h2>
                <div className="space-y-3">{upcomingHotels.map((b) => <HotelBookingCard key={b.id} booking={b} />)}</div>
              </div>
            )}
            {pastHotels.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Past</h2>
                <div className="space-y-3">{pastHotels.map((b) => <HotelBookingCard key={b.id} booking={b} />)}</div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
