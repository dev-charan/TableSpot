import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, UtensilsCrossed, SlidersHorizontal, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import RestaurantCard from '../components/RestaurantCard';
import WeatherBanner from '../components/WeatherBanner';
import { useWeather } from '../hooks/useWeather';

const cuisines = ['All', 'Indian', 'Chinese', 'Italian', 'Continental', 'Japanese', 'Mexican', 'Thai', 'Mediterranean'];

export default function Home() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [page, setPage] = useState(1);
  const weather = useWeather();

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/restaurants/cities').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['restaurants', search, city, cuisine, page],
    queryFn: () =>
      api.get('/restaurants', { params: { search, city, cuisine: cuisine !== 'All' ? cuisine : '', page } }).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 badge bg-brand-500/20 text-brand-500 mb-6 text-sm px-4 py-2">
            <UtensilsCrossed size={14} /> Reserve Your Perfect Table
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight">
            Find &amp; Book the Best<br />
            <span className="text-brand-500">Restaurants</span> Near You
          </h1>
          <p className="text-white/60 text-lg mb-10">
            Instant reservations, real-time availability, verified reviews — all in one place.
          </p>

          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search restaurants, cuisine..."
                className="w-full bg-transparent pl-9 pr-4 py-3 text-sm focus:outline-none placeholder-white/30"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
                className="bg-dark-700 pl-9 pr-8 py-3 text-sm rounded-xl border border-white/10 focus:outline-none focus:border-brand-500 appearance-none"
              >
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
        {weather && <WeatherBanner weather={weather} />}

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <SlidersHorizontal size={16} className="text-white/40 shrink-0" />
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => { setCuisine(c === 'All' ? '' : c); setPage(1); }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                (c === 'All' && !cuisine) || cuisine === c
                  ? 'bg-brand-500 text-white'
                  : 'glass glass-hover text-white/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-dark-700" />
            ))}
          </div>
        ) : (
          <>
            {data?.restaurants?.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🍽️</p>
                <p className="text-white/60">No restaurants found. Try different filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data?.restaurants?.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
              </div>
            )}

            {data?.pages > 1 && (
              <div className="flex justify-center gap-2">
                {[...Array(data.pages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === i + 1 ? 'bg-brand-500 text-white' : 'glass glass-hover text-white/60'
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
