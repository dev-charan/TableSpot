import { useState, useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import api from '../api/axios';

export default function LiveSeats({ restaurantId, date, partySize }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!restaurantId || !date) return;
    setLoading(true);
    try {
      const { data } = await api.get('/bookings/available', {
        params: { restaurant_id: restaurantId, date, party_size: partySize || 1 },
      });
      setSlots(data);
    } catch {}
    setLoading(false);
  }, [restaurantId, date, partySize]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleBookingUpdate = useCallback(() => { fetchSlots(); }, [fetchSlots]);
  useSocket(restaurantId, handleBookingUpdate);

  if (!date) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-brand-500" />
        <span className="text-sm font-medium">Live Availability</span>
        <span className="badge bg-green-500/20 text-green-400 text-xs">Real-time</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map(({ slot, available, tables }) => (
            <div
              key={slot}
              className={`text-center py-2.5 rounded-xl text-xs font-medium border transition-all ${
                available
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/20 bg-red-500/5 text-red-400/50 line-through'
              }`}
            >
              <div>{slot}</div>
              {available && (
                <div className="text-green-400/60 text-[10px] mt-0.5">{tables.length} table{tables.length !== 1 ? 's' : ''}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
