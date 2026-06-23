import { Link } from 'react-router-dom';
import { Star, MapPin, Wifi, Car, Waves, Dumbbell, UtensilsCrossed, Sparkles } from 'lucide-react';

const amenityIcons = {
  WiFi: Wifi, Parking: Car, Pool: Waves, Gym: Dumbbell, Restaurant: UtensilsCrossed, Spa: Sparkles,
};

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function HotelCard({ hotel }) {
  const {
    id, name, star_rating, hotel_type, city, address,
    cover_image, avg_rating, total_reviews, amenities,
    min_price, max_price, total_bookings,
  } = hotel;

  return (
    <Link to={`/hotel/${id}`} className="card group glass-hover block animate-slide-up">
      <div className="relative overflow-hidden h-52">
        {cover_image ? (
          <img src={cover_image} alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-dark-600 flex items-center justify-center">
            <span className="text-5xl">🏨</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2">
          <span className="badge bg-dark-800/80 backdrop-blur-sm text-amber-400 border border-white/10 text-xs">
            {stars(star_rating || 3)}
          </span>
          <span className="badge bg-dark-800/80 backdrop-blur-sm text-white/70 border border-white/10 capitalize">
            {hotel_type}
          </span>
        </div>

        {min_price && (
          <div className="absolute bottom-3 right-3">
            <div className="glass rounded-xl px-3 py-1.5 text-right">
              <p className="text-xs text-white/50">from</p>
              <p className="text-sm font-bold text-white">₹{Math.round(min_price).toLocaleString()}<span className="text-xs text-white/50">/night</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-base leading-tight line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium">{parseFloat(avg_rating || 0).toFixed(1)}</span>
            <span className="text-xs text-white/40">({total_reviews || 0})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/50 text-xs mb-3">
          <MapPin size={11} /> <span className="line-clamp-1">{city || address}</span>
        </div>

        {amenities?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {amenities.slice(0, 4).map((a) => {
              const Icon = amenityIcons[a];
              return Icon ? (
                <div key={a} className="flex items-center gap-1 text-xs text-white/40">
                  <Icon size={11} /> <span>{a}</span>
                </div>
              ) : (
                <span key={a} className="text-xs text-white/30">{a}</span>
              );
            })}
            {amenities.length > 4 && <span className="text-xs text-white/30">+{amenities.length - 4} more</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
