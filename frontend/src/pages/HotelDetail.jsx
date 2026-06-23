import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, MapPin, Phone, Globe, ChevronLeft, Users, BedDouble,
  Wifi, Car, Waves, Dumbbell, UtensilsCrossed, Sparkles,
  Clock, Navigation, MessageSquare, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays, differenceInDays } from 'date-fns';
import api from '../api/axios';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';
import DateRangePicker from '../components/hotel/DateRangePicker';

const amenityIcons = {
  WiFi: Wifi, Parking: Car, Pool: Waves, Gym: Dumbbell, Restaurant: UtensilsCrossed, Spa: Sparkles,
};

const stars = (n) => Array.from({ length: 5 }, (_, i) => (
  <span key={i} className={i < n ? 'text-amber-400' : 'text-white/20'}>★</span>
));

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map((n) => (
      <span key={n} onClick={() => onChange?.(n)} className={`cursor-pointer text-2xl ${n <= value ? 'text-amber-400' : 'text-white/20'}`}>★</span>
    ))}
  </div>
);

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const qc = useQueryClient();

  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['hotel', id],
    queryFn: () => api.get(`/hotels/${id}`).then((r) => r.data),
  });

  const { data: availability = [], isFetching: availFetching } = useQuery({
    queryKey: ['room-availability', id, checkIn, checkOut, guests, rooms],
    queryFn: () =>
      api.get(`/rooms/${id}/availability`, { params: { check_in: checkIn, check_out: checkOut, guests, rooms } }).then((r) => r.data),
    enabled: !!checkIn && !!checkOut && nights > 0,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['hotel-reviews', id],
    queryFn: () => api.get(`/hotel-reviews/hotel/${id}`).then((r) => r.data),
  });

  const { data: userBookings = [] } = useQuery({
    queryKey: ['my-hotel-bookings'],
    queryFn: () => api.get('/hotel-bookings/mine').then((r) => r.data),
    enabled: isLoggedIn,
  });

  const completedBookingForReview = userBookings.find(
    (b) => b.hotel_id === id && b.status === 'completed' && !b.review_rating
  );

  const bookMutation = useMutation({
    mutationFn: (data) => api.post('/hotel-bookings', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['my-hotel-bookings']);
      qc.invalidateQueries(['room-availability']);
      const roomType = availability.find((r) => r.id === selectedRoom);
      navigate('/booking/confirmation', { state: { type: 'hotel', booking: res.data, hotel, roomType } });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed'),
  });

  const reviewMutation = useMutation({
    mutationFn: (data) => api.post('/hotel-reviews', data),
    onSuccess: () => {
      toast.success('Review submitted!');
      qc.invalidateQueries(['hotel-reviews', id]);
      qc.invalidateQueries(['hotel', id]);
      setReviewForm({ rating: 5, comment: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: () => api.post(`/hotel-reviews/hotel/${id}/ai-summary`),
    onSuccess: () => { toast.success('AI summary generated!'); qc.invalidateQueries(['hotel', id]); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleBook = () => {
    if (!isLoggedIn) return navigate('/login', { state: { from: `/hotel/${id}` } });
    if (!selectedRoom) return toast.error('Select a room type');
    if (nights <= 0) return toast.error('Invalid dates');
    bookMutation.mutate({ hotel_id: id, room_type_id: selectedRoom, check_in: checkIn, check_out: checkOut, guests, rooms });
  };

  const getETA = useCallback(async () => {
    if (!hotel?.lat || !hotel?.lng) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pos.coords.longitude},${pos.coords.latitude};${hotel.lng},${hotel.lat}?overview=false`
        ).then((r) => r.json());
        const mins = Math.round(data.routes[0].duration / 60);
        toast.success(`Approximately ${mins} min away by road`);
      } catch { toast.error('Could not get ETA'); }
    }, () => toast.error('Location access denied'));
  }, [hotel]);

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-80 bg-dark-700 rounded-2xl mb-6" />
      <div className="h-8 bg-dark-700 rounded w-1/3 mb-4" />
    </div>
  );
  if (!hotel) return <div className="text-center py-20 text-white/50">Hotel not found</div>;

  const tabs = ['overview', 'rooms', 'reviews'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <ChevronLeft size={18} /> Back
      </button>

      <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden mb-8">
        {hotel.cover_image ? (
          <img src={hotel.cover_image} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/30 to-dark-700 flex items-center justify-center text-7xl">🏨</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="badge bg-amber-500/80 text-white text-sm">{stars(hotel.star_rating)}</span>
            <span className="badge bg-dark-800/80 text-white/70 capitalize">{hotel.hotel_type}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{hotel.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-white">{parseFloat(hotel.avg_rating || 0).toFixed(1)}</span>
              <span>({hotel.total_reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1"><MapPin size={14} /> {hotel.city}</div>
            <div className="flex items-center gap-1"><Clock size={14} /> Check-in: {hotel.check_in_time} | Out: {hotel.check_out_time}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-1 glass rounded-2xl p-1">
            {tabs.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl capitalize transition-all ${
                  activeTab === t ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white'
                }`}>{t}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-5 animate-fade-in">
              {hotel.ai_summary && (
                <div className="glass rounded-2xl p-5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">AI Highlights</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{hotel.ai_summary}</p>
                </div>
              )}

              {hotel.description && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{hotel.description}</p>
                </div>
              )}

              {hotel.amenities?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-4">Amenities</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {hotel.amenities.map((a) => {
                      const Icon = amenityIcons[a] || CheckCircle;
                      return (
                        <div key={a} className="flex items-center gap-2 text-sm text-white/60">
                          <Icon size={16} className="text-blue-400 shrink-0" /> {a}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card p-5 space-y-3">
                <h3 className="font-semibold">Details</h3>
                {hotel.address && (
                  <div className="flex items-start gap-3 text-sm text-white/60">
                    <MapPin size={15} className="shrink-0 mt-0.5 text-blue-400" />
                    {hotel.address}, {hotel.city}
                  </div>
                )}
                {hotel.phone && (
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Phone size={15} className="text-blue-400" /> {hotel.phone}
                  </div>
                )}
                {hotel.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe size={15} className="text-blue-400" />
                    <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{hotel.website}</a>
                  </div>
                )}
                <button onClick={getETA} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2">
                  <Navigation size={14} /> Get ETA from my location
                </button>
              </div>

              {hotel.lat && hotel.lng && (
                <div className="card overflow-hidden">
                  <MapPicker lat={hotel.lat} lng={hotel.lng} readOnly height="250px" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4 animate-fade-in">
              {availFetching && (
                <div className="text-center py-4 text-white/40 text-sm">Checking availability...</div>
              )}
              {availability.length === 0 ? (
                <div className="text-center py-12 text-white/40">No rooms available for selected dates and guests</div>
              ) : (
                availability.map((room) => (
                  <div key={room.id}
                    onClick={() => room.is_available_now && setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                    className={`card p-5 transition-all cursor-pointer ${
                      !room.is_available_now ? 'opacity-50 cursor-not-allowed' :
                      selectedRoom === room.id ? 'border-blue-500 ring-1 ring-blue-500' : 'glass-hover'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {room.images?.[0] ? (
                        <img src={room.images[0]} alt={room.name} className="w-24 h-20 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-24 h-20 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 text-2xl">🛏️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                              <span className="flex items-center gap-1"><Users size={11} /> Max {room.max_occupancy} guests</span>
                              <span className="flex items-center gap-1"><BedDouble size={11} /> {room.available_rooms} available</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-lg">₹{Math.round(room.price_per_night).toLocaleString()}<span className="text-xs text-white/40 font-normal">/night</span></p>
                            {nights > 0 && (
                              <p className="text-xs text-blue-400 font-medium">₹{Math.round(room.total_price).toLocaleString()} total</p>
                            )}
                          </div>
                        </div>

                        {room.description && <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{room.description}</p>}

                        {room.amenities?.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {room.amenities.map((a) => (
                              <span key={a} className="badge bg-white/5 text-white/40 text-[10px]">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {!room.is_available_now && (
                      <div className="mt-3 text-xs text-red-400 text-center">Not available for selected dates</div>
                    )}
                    {selectedRoom === room.id && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-blue-400 text-sm">
                        <CheckCircle size={14} /> Selected
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fade-in">
              {user?.id === hotel.owner_id && (
                <button onClick={() => aiSummaryMutation.mutate()} disabled={aiSummaryMutation.isPending}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
                  <Sparkles size={15} className="text-blue-400" />
                  {aiSummaryMutation.isPending ? 'Generating...' : 'Generate AI Summary'}
                </button>
              )}

              {completedBookingForReview && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-400" /> Leave a Review
                  </h3>
                  <div className="space-y-4">
                    <StarRating value={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                    <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      className="input resize-none" rows={3} placeholder="Share your experience..." />
                    <button onClick={() => reviewMutation.mutate({ hotel_id: id, booking_id: completedBookingForReview.id, ...reviewForm })}
                      disabled={reviewMutation.isPending} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all">
                      {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-12 text-white/40">No reviews yet. Be the first!</div>
              ) : reviews.map((rv) => (
                <div key={rv.id} className="card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-400">
                        {rv.user_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rv.user_name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-white/40">{format(new Date(rv.created_at), 'MMM d, yyyy')}</p>
                          {rv.room_type_name && <span className="text-xs text-white/30">• {rv.room_type_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex">{[1,2,3,4,5].map((n) => (
                      <span key={n} className={`text-sm ${n <= rv.rating ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                    ))}</div>
                  </div>
                  {rv.comment && <p className="text-sm text-white/70 leading-relaxed">{rv.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5 sticky top-20">
            <h3 className="font-semibold mb-4">Book Your Stay</h3>

            <div className="space-y-4">
              <DateRangePicker
                checkIn={checkIn} checkOut={checkOut}
                onCheckIn={setCheckIn} onCheckOut={setCheckOut}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Guests</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-sm">−</button>
                    <span className="font-semibold w-6 text-center">{guests}</span>
                    <button onClick={() => setGuests(guests + 1)} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-sm">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Rooms</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-sm">−</button>
                    <span className="font-semibold w-6 text-center">{rooms}</span>
                    <button onClick={() => setRooms(rooms + 1)} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-sm">+</button>
                  </div>
                </div>
              </div>

              {nights > 0 && (
                <p className="text-xs text-center text-blue-400 font-medium">{nights} night{nights > 1 ? 's' : ''}</p>
              )}

              {selectedRoom && availability.find((r) => r.id === selectedRoom) && (
                <div className="glass rounded-xl p-3 border border-blue-500/30">
                  <p className="text-xs text-white/50">Selected</p>
                  <p className="font-medium text-sm">{availability.find((r) => r.id === selectedRoom)?.name}</p>
                  <p className="text-blue-400 font-bold">
                    ₹{Math.round(availability.find((r) => r.id === selectedRoom)?.total_price || 0).toLocaleString()} total
                  </p>
                </div>
              )}

              {!selectedRoom && nights > 0 && (
                <button onClick={() => setActiveTab('rooms')}
                  className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors py-2 glass rounded-xl border border-blue-500/20">
                  View Available Rooms →
                </button>
              )}

              <button onClick={handleBook} disabled={bookMutation.isPending || !selectedRoom}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-95">
                {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
              </button>

              <div className="text-xs text-center text-white/30 space-y-1">
                <p>Free cancellation available</p>
                <p>Check-in: {hotel.check_in_time} | Check-out: {hotel.check_out_time}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
