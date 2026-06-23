import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle, Calendar, Clock, Users, BedDouble,
  IndianRupee, ArrowRight, Moon,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const toDate = (d) => {
  if (!d) return new Date();
  const s = typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d;
  return new Date(s);
};

function Row({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-green-400 font-semibold' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export default function BookingConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, []);

  if (!state) return null;

  const { type, booking, restaurant, hotel, roomType } = state;
  const isHotel = type === 'hotel';
  const ref = booking.id?.replace(/-/g, '').slice(0, 8).toUpperCase();
  const nights = isHotel
    ? differenceInDays(toDate(booking.check_out), toDate(booking.check_in))
    : 0;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-5 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500/10">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
          <p className="text-white/50 text-sm mt-1">
            {isHotel ? 'Your room has been reserved.' : 'Your table has been reserved.'}
          </p>
        </div>

        <div className="glass rounded-2xl p-5 text-center border border-green-500/20">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Booking Reference</p>
          <p className="text-3xl font-mono font-bold tracking-[0.2em] text-green-400">{ref}</p>
          <p className="text-xs text-white/30 mt-2">Screenshot this for your records</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              isHotel ? 'bg-blue-500/20' : 'bg-brand-500/20'
            }`}>
              {isHotel ? '🏨' : '🍽️'}
            </div>
            <div>
              <p className="font-semibold">{hotel?.name || restaurant?.name}</p>
              <p className="text-xs text-white/40">{hotel?.city || restaurant?.city}</p>
            </div>
          </div>

          {isHotel ? (
            <div className="space-y-3">
              {roomType && <Row icon={BedDouble} label="Room Type" value={roomType.name} />}
              <Row icon={Calendar} label="Check-in" value={format(toDate(booking.check_in), 'EEE, MMM d, yyyy')} />
              <Row icon={Calendar} label="Check-out" value={format(toDate(booking.check_out), 'EEE, MMM d, yyyy')} />
              <Row icon={Moon} label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
              <Row icon={Users} label="Guests" value={`${booking.guests} guest${booking.guests > 1 ? 's' : ''} · ${booking.rooms} room${booking.rooms > 1 ? 's' : ''}`} />
              <Row icon={IndianRupee} label="Total Amount" value={`₹${Math.round(booking.total_price).toLocaleString()}`} highlight />
            </div>
          ) : (
            <div className="space-y-3">
              <Row icon={Calendar} label="Date" value={format(toDate(booking.booking_date), 'EEE, MMM d, yyyy')} />
              <Row icon={Clock} label="Time" value={booking.time_slot} />
              <Row icon={Users} label="Party Size" value={`${booking.party_size} ${booking.party_size === 1 ? 'guest' : 'guests'}`} />
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-amber-500/20">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <p className="text-sm text-white/60">
            Status: <span className="text-amber-400 font-medium capitalize">{booking.status || 'pending'}</span>
            {' '}— the owner will confirm shortly.
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/my-bookings" className="btn-primary w-full flex items-center justify-center gap-2">
            View My Bookings <ArrowRight size={16} />
          </Link>
          <Link
            to={isHotel ? `/hotel/${booking.hotel_id}` : `/restaurant/${booking.restaurant_id}`}
            className="btn-ghost w-full block text-center text-sm"
          >
            Back to {hotel?.name || restaurant?.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
