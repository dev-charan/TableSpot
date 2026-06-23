import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Building2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import api from '../api/axios';
import HotelCard from '../components/hotel/HotelCard';
import WeatherBanner from '../components/WeatherBanner';
import { useWeather } from '../hooks/useWeather';

const hotelTypes = ['All', 'hotel', 'resort', 'hostel', 'apartment', 'villa', 'boutique'];
const starFilters = [0, 1, 2, 3, 4, 5];

export default function Hotels() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [hotelType, setHotelType] = useState('');
  const [starRating, setStarRating] = useState('');
  const [page, setPage] = useState(1);
  const weather = useWeather();

  const { data: cities = [] } = useQuery({
    queryKey: ['hotel-cities'],
    queryFn: () => api.get('/hotels/cities').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hotels', search, city, hotelType, starRating, page],
    queryFn: () =>
      api.get('/hotels', {
        params: {
          search, city,
          hotel_type: hotelType !== 'All' ? hotelType : '',
          star_rating: starRating || '',
          page,
        },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 badge bg-blue-500/20 text-blue-400 mb-6 text-sm px-4 py-2">
            <Building2 size={14} /> Find Your Perfect Stay
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight">
            Hotels, Resorts &<br />
            <span className="text-blue-400">Everything In Between</span>
          </h1>
          <p className="text-white/60 text-lg mb-10">
            Search, compare and book hotels across India — real-time availability, instant confirmation.
          </p>

          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search hotels, resorts..."
                className="w-full bg-transparent pl-9 pr-4 py-3 text-sm focus:outline-none placeholder-white/30"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
                className="bg-dark-700 pl-9 pr-8 py-3 text-sm rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-6">
        {weather && <WeatherBanner weather={weather} />}

        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal size={16} className="text-white/40 shrink-0" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {hotelTypes.map((t) => (
              <button
                key={t}
                onClick={() => { setHotelType(t === 'All' ? '' : t); setPage(1); }}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  (t === 'All' && !hotelType) || hotelType === t
                    ? 'bg-blue-500 text-white'
                    : 'glass glass-hover text-white/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 ml-auto">
            {[0, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => { setStarRating(s === 0 ? '' : String(s)); setPage(1); }}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  (s === 0 && !starRating) || starRating === String(s)
                    ? 'bg-amber-500/80 text-white'
                    : 'glass text-white/50 hover:text-white'
                }`}
              >
                {s === 0 ? 'All Stars' : `${'★'.repeat(s)}`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="card h-80 animate-pulse bg-dark-700" />)}
          </div>
        ) : (
          <>
            {data?.hotels?.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🏨</p>
                <p className="text-white/60">No hotels found. Try different filters.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/40">{data?.total} hotel{data?.total !== 1 ? 's' : ''} found</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {data?.hotels?.map((h) => <HotelCard key={h.id} hotel={h} />)}
                </div>
              </>
            )}

            {data?.pages > 1 && (
              <div className="flex justify-center gap-2">
                {[...Array(data.pages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === i + 1 ? 'bg-blue-500 text-white' : 'glass glass-hover text-white/60'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
