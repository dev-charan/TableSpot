import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Users, TrendingUp } from 'lucide-react';

const priceLabel = (p) => ['', '₹', '₹₹', '₹₹₹', '₹₹₹₹'][p] || '₹₹';

export default function RestaurantCard({ restaurant }) {
  const {
    id, name, cuisine_type, address, city, cover_image,
    avg_rating, total_reviews, price_range, today_bookings,
    opening_hours, total_bookings,
  } = restaurant;

  return (
    <Link to={`/restaurant/${id}`} className="card group glass-hover block animate-slide-up">
      <div className="relative overflow-hidden h-48">
        {cover_image ? (
          <img
            src={cover_image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-dark-600 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2">
          {cuisine_type && (
            <span className="badge bg-dark-800/80 backdrop-blur-sm text-white/80 border border-white/10">
              {cuisine_type}
            </span>
          )}
          <span className="badge bg-dark-800/80 backdrop-blur-sm text-white/80 border border-white/10">
            {priceLabel(price_range)}
          </span>
        </div>

        {parseInt(today_bookings) > 0 && (
          <div className="absolute top-3 right-3">
            <span className="badge bg-brand-500/90 backdrop-blur-sm text-white">
              <TrendingUp size={10} />
              {today_bookings} today
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium">{parseFloat(avg_rating || 0).toFixed(1)}</span>
            <span className="text-xs text-white/40">({total_reviews || 0})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/50 text-xs mb-3">
          <MapPin size={11} />
          <span className="line-clamp-1">{city || address}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-white/40">
          {opening_hours && (
            <div className="flex items-center gap-1">
              <Clock size={11} />
              <span>{opening_hours.open} – {opening_hours.close}</span>
            </div>
          )}
          {total_bookings > 0 && (
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{total_bookings} bookings</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
