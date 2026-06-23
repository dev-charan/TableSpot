import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, MapPin, Phone, Globe, Clock, Users, ChevronLeft, Calendar,
  MessageSquare, Sparkles, Navigation, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import api from '../api/axios';
import MapPicker from '../components/MapPicker';
import LiveSeats from '../components/LiveSeats';
import { useAuth } from '../context/AuthContext';

const priceLabel = (p) => ['', '₹ Budget', '₹₹ Mid-range', '₹₹₹ Premium', '₹₹₹₹ Fine Dining'][p] || '';

const StarRating = ({ value, onChange }) => (
  <div className="star-rating flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} onClick={() => onChange?.(n)} className={n <= value ? 'text-amber-400' : 'text-white/20'}>★</span>
    ))}
  </div>
);

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const qc = useQueryClient();

  const [bookingForm, setBookingForm] = useState({
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time_slot: '',
    party_size: 2,
    table_id: '',
    special_requests: '',
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => api.get(`/restaurants/${id}`).then((r) => r.data),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => api.get(`/reviews/restaurant/${id}`).then((r) => r.data),
  });

  const { data: userBookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/mine').then((r) => r.data),
    enabled: isLoggedIn,
  });

  const completedBookingForReview = userBookings.find(
    (b) => b.restaurant_id === id && b.status === 'completed' && !b.review_rating
  );

  const { data: slots = [] } = useQuery({
    queryKey: ['slots', id, bookingForm.date, bookingForm.party_size],
    queryFn: () =>
      api.get('/bookings/available', {
        params: { restaurant_id: id, date: bookingForm.date, party_size: bookingForm.party_size },
      }).then((r) => r.data),
    enabled: !!bookingForm.date,
  });

  const bookMutation = useMutation({
    mutationFn: (data) => api.post('/bookings', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['my-bookings']);
      qc.invalidateQueries(['slots']);
      navigate('/booking/confirmation', { state: { type: 'restaurant', booking: res.data, restaurant } });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed'),
  });

  const reviewMutation = useMutation({
    mutationFn: (data) => api.post('/reviews', data),
    onSuccess: () => {
      toast.success('Review submitted!');
      qc.invalidateQueries(['reviews', id]);
      qc.invalidateQueries(['restaurant', id]);
      setReviewForm({ rating: 5, comment: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit review'),
  });

  const aiSummaryMutation = useMutation({
    mutationFn: () => api.post(`/reviews/restaurant/${id}/ai-summary`),
    onSuccess: (res) => {
      toast.success('AI summary generated!');
      qc.invalidateQueries(['restaurant', id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'AI summary failed'),
  });

  const handleSlotSelect = useCallback((slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setBookingForm((f) => ({ ...f, time_slot: slot.slot, table_id: slot.tables[0]?.id || '' }));
  }, []);

  const handleBook = () => {
    if (!isLoggedIn) return navigate('/login', { state: { from: `/restaurant/${id}` } });
    if (!bookingForm.time_slot) return toast.error('Please select a time slot');
    if (!bookingForm.table_id) return toast.error('No table available for selected time');
    bookMutation.mutate({ ...bookingForm, restaurant_id: id });
  };

  const getETA = useCallback(async () => {
    if (!restaurant?.lat || !restaurant?.lng) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { data } = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pos.coords.longitude},${pos.coords.latitude};${restaurant.lng},${restaurant.lat}?overview=false`
        ).then((r) => r.json());
        const mins = Math.round(data.routes[0].duration / 60);
        toast.success(`You are approximately ${mins} min away by road`);
      } catch { toast.error('Could not get ETA'); }
    }, () => toast.error('Location access denied'));
  }, [restaurant]);

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-80 bg-dark-700 rounded-2xl mb-6" />
      <div className="h-8 bg-dark-700 rounded w-1/3 mb-4" />
    </div>
  );

  if (!restaurant) return <div className="text-center py-20 text-white/50">Restaurant not found</div>;

  const tabs = ['overview', 'menu', 'reviews'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <ChevronLeft size={18} /> Back
      </button>

      <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden mb-8">
        {restaurant.cover_image ? (
          <img src={restaurant.cover_image} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-dark-700 flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {restaurant.cuisine_type && (
              <span className="badge bg-brand-500/80 text-white">{restaurant.cuisine_type}</span>
            )}
            <span className="badge bg-dark-800/80 text-white/70">{priceLabel(restaurant.price_range)}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-white">{parseFloat(restaurant.avg_rating || 0).toFixed(1)}</span>
              <span>({restaurant.total_reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={14} /> {restaurant.city}
            </div>
            {restaurant.opening_hours && (
              <div className="flex items-center gap-1">
                <Clock size={14} /> {restaurant.opening_hours.open} – {restaurant.opening_hours.close}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-1 glass rounded-2xl p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl capitalize transition-all ${
                  activeTab === t ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {restaurant.ai_summary && (
                <div className="glass rounded-2xl p-5 border border-brand-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-brand-500" />
                    <span className="text-sm font-semibold text-brand-400">AI Highlights</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{restaurant.ai_summary}</p>
                </div>
              )}

              {restaurant.description && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{restaurant.description}</p>
                </div>
              )}

              <div className="card p-5 space-y-3">
                <h3 className="font-semibold">Details</h3>
                {restaurant.address && (
                  <div className="flex items-start gap-3 text-sm text-white/60">
                    <MapPin size={15} className="shrink-0 mt-0.5 text-brand-500" />
                    <span>{restaurant.address}, {restaurant.city}</span>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <Phone size={15} className="text-brand-500" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
                {restaurant.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe size={15} className="text-brand-500" />
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                      {restaurant.website}
                    </a>
                  </div>
                )}
                <button onClick={getETA} className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-2">
                  <Navigation size={14} /> Get ETA from my location
                </button>
              </div>

              {restaurant.lat && restaurant.lng && (
                <div className="card overflow-hidden">
                  <MapPicker lat={restaurant.lat} lng={restaurant.lng} readOnly height="250px" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-4 animate-fade-in">
              {restaurant.menu?.length === 0 ? (
                <div className="text-center py-12 text-white/40">No menu available yet</div>
              ) : (
                restaurant.menu?.map((cat) => (
                  <div key={cat.category_id} className="card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedCategory(expandedCategory === cat.category_id ? null : cat.category_id)}
                    >
                      <span className="font-semibold">{cat.category_name}</span>
                      {expandedCategory === cat.category_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedCategory === cat.category_id && (
                      <div className="divide-y divide-white/5">
                        {cat.items?.filter(Boolean).map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-4">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{item.name}</p>
                                {item.is_must_try && (
                                  <span className="badge bg-brand-500/20 text-brand-400 text-[10px]">Must Try</span>
                                )}
                              </div>
                              {item.description && <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{item.description}</p>}
                            </div>
                            {item.price && (
                              <p className="text-brand-400 font-semibold text-sm shrink-0">₹{item.price}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fade-in">
              {user?.id === restaurant.owner_id && (
                <button
                  onClick={() => aiSummaryMutation.mutate()}
                  disabled={aiSummaryMutation.isPending}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles size={15} className="text-brand-500" />
                  {aiSummaryMutation.isPending ? 'Generating...' : 'Generate AI Summary from Reviews'}
                </button>
              )}

              {completedBookingForReview && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-brand-500" /> Leave a Review
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Your Rating</label>
                      <StarRating value={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                    </div>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      className="input resize-none"
                      rows={3}
                      placeholder="Share your experience..."
                    />
                    <button
                      onClick={() => reviewMutation.mutate({ restaurant_id: id, booking_id: completedBookingForReview.id, ...reviewForm })}
                      disabled={reviewMutation.isPending}
                      className="btn-primary text-sm"
                    >
                      {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-12 text-white/40">No reviews yet. Be the first!</div>
              ) : (
                reviews.map((rv) => (
                  <div key={rv.id} className="card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-500/20 rounded-full flex items-center justify-center text-sm font-bold text-brand-400">
                          {rv.user_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{rv.user_name}</p>
                          <p className="text-xs text-white/40">{format(new Date(rv.created_at), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <span key={n} className={`text-sm ${n <= rv.rating ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    {rv.comment && <p className="text-sm text-white/70 leading-relaxed">{rv.comment}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5 sticky top-20">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-brand-500" /> Reserve a Table
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={bookingForm.date}
                  min={format(addDays(new Date(), 0), 'yyyy-MM-dd')}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value, time_slot: '', table_id: '' })}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Party Size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBookingForm((f) => ({ ...f, party_size: Math.max(1, f.party_size - 1) }))}
                    className="w-9 h-9 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">−</button>
                  <span className="font-semibold w-8 text-center">{bookingForm.party_size}</span>
                  <button onClick={() => setBookingForm((f) => ({ ...f, party_size: Math.min(20, f.party_size + 1) }))}
                    className="w-9 h-9 glass rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">+</button>
                  <Users size={14} className="text-white/40" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-2 block">Available Times</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {slots.map((slot) => (
                    <button
                      key={slot.slot}
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot)}
                      className={`py-2 text-xs rounded-lg border transition-all ${
                        bookingForm.time_slot === slot.slot
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : slot.available
                          ? 'border-white/10 hover:border-brand-500/50 text-white/70'
                          : 'border-white/5 text-white/20 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.slot}
                    </button>
                  ))}
                </div>
              </div>

              {bookingForm.time_slot && selectedSlot?.tables?.length > 1 && (
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Select Table</label>
                  <select
                    value={bookingForm.table_id}
                    onChange={(e) => setBookingForm({ ...bookingForm, table_id: e.target.value })}
                    className="input text-sm"
                  >
                    {selectedSlot.tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.table_number} ({t.capacity} seats, {t.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Special Requests (optional)</label>
                <textarea
                  value={bookingForm.special_requests}
                  onChange={(e) => setBookingForm({ ...bookingForm, special_requests: e.target.value })}
                  className="input text-sm resize-none"
                  rows={2}
                  placeholder="Allergies, birthday, high chair..."
                />
              </div>

              <button
                onClick={handleBook}
                disabled={bookMutation.isPending}
                className="btn-primary w-full"
              >
                {bookMutation.isPending ? 'Booking...' : 'Confirm Reservation'}
              </button>

              {!isLoggedIn && (
                <p className="text-xs text-center text-white/40">You'll be asked to sign in</p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <LiveSeats restaurantId={id} date={bookingForm.date} partySize={bookingForm.party_size} />
          </div>
        </div>
      </div>
    </div>
  );
}
