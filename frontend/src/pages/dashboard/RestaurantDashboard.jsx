import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Table2, CalendarDays, BookOpen, Plus,
  TrendingUp, Users, Star, XCircle, ChevronRight, Pencil,
} from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/dashboard/tables', label: 'Tables', icon: Table2 },
  { to: '/dashboard/menu', label: 'Menu', icon: BookOpen },
  { to: '/dashboard/edit', label: 'Edit Listing', icon: Pencil },
];

export default function RestaurantDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['my-restaurants'],
    queryFn: () => api.get('/restaurants/mine').then((r) => r.data),
  });

  useEffect(() => {
    if (restaurants.length && !selectedRestaurant) setSelectedRestaurant(restaurants[0].id);
  }, [restaurants]);

  const current = restaurants.find((r) => r.id === selectedRestaurant) || restaurants[0];

  const { data: stats } = useQuery({
    queryKey: ['stats', current?.id],
    queryFn: () => api.get(`/restaurants/${current.id}/stats`).then((r) => r.data),
    enabled: !!current?.id,
  });

  const isExact = location.pathname === '/dashboard';

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-dark-800 border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <p className="text-xs text-white/40 mb-2">Restaurant</p>
          {restaurants.length > 0 ? (
            <select
              value={selectedRestaurant || ''}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full bg-dark-700 text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none"
            >
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          ) : (
            <Link to="/dashboard/register-restaurant" className="btn-primary text-xs py-2 flex items-center justify-center gap-1">
              <Plus size={12} /> Add Restaurant
            </Link>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/dashboard';
            const isOverview = exact && location.pathname === '/dashboard';
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active || isOverview ? 'bg-brand-500/20 text-brand-400' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <Link to="/dashboard/register-restaurant" className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <Plus size={16} /> Add Restaurant
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {isExact && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{current?.name || 'Dashboard'}</h1>
                <p className="text-white/50 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
              </div>
              <Link to={`/restaurant/${current?.id}`} className="btn-ghost text-sm flex items-center gap-2">
                View Public Page <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's Bookings", value: stats?.today_bookings || 0, icon: CalendarDays, color: 'text-brand-500' },
                { label: 'Upcoming', value: stats?.total_upcoming || 0, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Cancellations', value: stats?.today_cancellations || 0, icon: XCircle, color: 'text-red-400' },
                { label: 'No Shows', value: stats?.no_shows || 0, icon: Users, color: 'text-orange-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-5">
                  <div className={`${color} mb-3`}><Icon size={20} /></div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-white/50 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {current && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Rating', value: `${parseFloat(current.avg_rating || 0).toFixed(1)} ★`, icon: Star },
                  { label: 'Total Bookings', value: current.total_bookings || 0, icon: CalendarDays },
                  { label: 'Reviews', value: current.total_reviews || 0, icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center">
                      <Icon size={18} className="text-brand-500" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{value}</p>
                      <p className="text-xs text-white/50">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/dashboard/bookings" className="card p-5 glass-hover flex items-center justify-between group">
                <div>
                  <p className="font-semibold">Manage Bookings</p>
                  <p className="text-xs text-white/50 mt-1">View and update reservations</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
              </Link>
              <Link to="/dashboard/menu" className="card p-5 glass-hover flex items-center justify-between group">
                <div>
                  <p className="font-semibold">Menu Management</p>
                  <p className="text-xs text-white/50 mt-1">Add items or use OCR scanner</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>
        )}

        {!isExact && <Outlet context={{ restaurantId: current?.id, restaurants, setSelectedRestaurant }} />}
      </main>
    </div>
  );
}
