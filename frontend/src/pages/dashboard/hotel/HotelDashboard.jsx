import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Building2, BedDouble, CalendarDays, Plus, Pencil,
  TrendingUp, IndianRupee, ChevronRight, XCircle,
  CheckCircle, AlertTriangle, Star, Menu, X,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../../api/axios';

const navItems = [
  { to: '/hotel-dashboard', label: 'Overview', icon: Building2, exact: true },
  { to: '/hotel-dashboard/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/hotel-dashboard/rooms', label: 'Room Types', icon: BedDouble },
  { to: '/hotel-dashboard/edit', label: 'Edit Listing', icon: Pencil },
];

export default function HotelDashboard() {
  const location = useLocation();
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: hotels = [] } = useQuery({
    queryKey: ['my-hotels'],
    queryFn: () => api.get('/hotels/mine').then((r) => r.data),
  });

  useEffect(() => {
    if (hotels.length && !selectedHotel) setSelectedHotel(hotels[0].id);
  }, [hotels]);

  const current = hotels.find((h) => h.id === selectedHotel) || hotels[0];

  const { data: stats } = useQuery({
    queryKey: ['hotel-stats', current?.id],
    queryFn: () => api.get(`/hotels/${current.id}/stats`).then((r) => r.data),
    enabled: !!current?.id,
    refetchInterval: 60000,
  });

  const isExact = location.pathname === '/hotel-dashboard';

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-white/5">
        <p className="text-xs text-white/40 mb-2">Hotel</p>
        {hotels.length > 0 ? (
          <select value={selectedHotel || ''}
            onChange={(e) => { setSelectedHotel(e.target.value); setSidebarOpen(false); }}
            className="w-full bg-dark-700 text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none">
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        ) : (
          <Link to="/hotel-dashboard/register"
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all">
            <Plus size={12} /> Add Hotel
          </Link>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = exact
            ? location.pathname === to
            : location.pathname.startsWith(to) && to !== '/hotel-dashboard';
          return (
            <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active ? 'bg-blue-500/20 text-blue-400' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={16} /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Link to="/hotel-dashboard/register" onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <Plus size={16} /> Add Hotel
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-dark-800 border-r border-white/5 flex-col">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-dark-800 border-r border-white/5 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="font-semibold text-sm">Hotel Dashboard</span>
              <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-auto min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 glass border-b border-white/5 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <Menu size={18} />
          </button>
          <span className="font-semibold text-sm">{current?.name || 'Hotel Dashboard'}</span>
        </div>

        {isExact ? (
          <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{current?.name || 'Hotel Dashboard'}</h1>
                <p className="text-white/50 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
              </div>
              {current && (
                <Link to={`/hotel/${current.id}`} className="btn-ghost text-sm flex items-center gap-2">
                  View Page <ChevronRight size={14} />
                </Link>
              )}
            </div>

            {/* Today's activity */}
            {(stats?.arriving_today > 0 || stats?.departing_today > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-2xl p-4 border border-green-500/20 flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-400">{stats.arriving_today}</p>
                    <p className="text-xs text-white/50">Arriving today</p>
                  </div>
                </div>
                <div className="glass rounded-2xl p-4 border border-blue-500/20 flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <ChevronRight size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-400">{stats.departing_today}</p>
                    <p className="text-xs text-white/50">Departing today</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Confirmed', value: stats?.total_confirmed || 0, icon: CalendarDays, color: 'text-blue-400' },
                { label: 'Upcoming', value: stats?.upcoming || 0, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Cancellations', value: stats?.total_cancelled || 0, icon: XCircle, color: 'text-red-400' },
                { label: 'No Shows', value: stats?.no_shows || 0, icon: AlertTriangle, color: 'text-orange-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <div className={`${color} mb-3`}><Icon size={20} /></div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-white/50 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <IndianRupee size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">₹{Math.round(stats?.total_revenue || 0).toLocaleString()}</p>
                  <p className="text-xs text-white/50">Total Revenue</p>
                </div>
              </div>
              <div className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <IndianRupee size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">₹{Math.round(stats?.revenue_this_month || 0).toLocaleString()}</p>
                  <p className="text-xs text-white/50">This Month</p>
                </div>
              </div>
            </div>

            {/* Rating row */}
            {current && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Avg Rating', value: `${parseFloat(current.avg_rating || 0).toFixed(1)} ★`, icon: Star },
                  { label: 'Total Bookings', value: current.total_bookings || 0, icon: CalendarDays },
                  { label: 'Reviews', value: current.total_reviews || 0, icon: Star },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">{value}</p>
                      <p className="text-xs text-white/50">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/hotel-dashboard/bookings" className="card p-5 glass-hover flex items-center justify-between group">
                <div>
                  <p className="font-semibold">Manage Bookings</p>
                  <p className="text-xs text-white/50 mt-1">Check-in, check-out, no-shows</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
              </Link>
              <Link to="/hotel-dashboard/rooms" className="card p-5 glass-hover flex items-center justify-between group">
                <div>
                  <p className="font-semibold">Room Types</p>
                  <p className="text-xs text-white/50 mt-1">Add rooms, pricing, amenities</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        ) : (
          <Outlet context={{ hotelId: current?.id, hotels, setSelectedHotel }} />
        )}
      </main>
    </div>
  );
}
