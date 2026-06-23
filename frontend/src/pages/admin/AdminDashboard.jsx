import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users, UtensilsCrossed, Building2, CalendarDays,
  TrendingUp, IndianRupee, AlertTriangle, CheckCircle,
  Clock, XCircle, ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const StatCard = ({ label, value, sub, icon: Icon, color, to }) => (
  <Link to={to || '#'} className="card p-5 glass-hover group block">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-current/10`}>
        <Icon size={18} className={color.replace('bg-', 'text-').replace('/10', '')} />
      </div>
      <ArrowUpRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
    </div>
    <p className="text-2xl font-bold mb-1">{value}</p>
    <p className="text-xs text-white/50">{label}</p>
    {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
  </Link>
);

const MiniBar = ({ value, max, color = 'bg-violet-500' }) => (
  <div className="w-full bg-dark-600 rounded-full h-1.5 mt-1">
    <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
  </div>
);

const statusIcon = { confirmed: CheckCircle, pending: Clock, cancelled: XCircle, completed: TrendingUp, no_show: AlertTriangle };
const statusColor = {
  confirmed: 'text-green-400', pending: 'text-yellow-400',
  cancelled: 'text-red-400', completed: 'text-blue-400', no_show: 'text-orange-400',
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-dark-700 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  const s = data;
  const maxDay = Math.max(...(s?.last7days?.map((d) => Math.max(d.restaurant_bookings, d.hotel_bookings)) || [1]));

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-white/40 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d yyyy')} • Auto-refreshes every 30s</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Users"
          value={parseInt(s?.users?.total || 0).toLocaleString()}
          sub={`+${s?.users?.new_this_week} this week`}
          icon={Users}
          color="bg-violet-500/10"
          to="/admin/users"
        />
        <StatCard
          label="Restaurants"
          value={parseInt(s?.restaurants?.total || 0).toLocaleString()}
          sub={`${s?.restaurants?.active} active · ${s?.restaurants?.pending} pending`}
          icon={UtensilsCrossed}
          color="bg-brand-500/10"
          to="/admin/restaurants"
        />
        <StatCard
          label="Hotels"
          value={parseInt(s?.hotels?.total || 0).toLocaleString()}
          sub={`${s?.hotels?.active} active · ${s?.hotels?.pending} pending`}
          icon={Building2}
          color="bg-blue-500/10"
          to="/admin/hotels"
        />
        <StatCard
          label="Hotel Revenue"
          value={`₹${Math.round(s?.hotel_bookings?.total_revenue || 0).toLocaleString()}`}
          sub={`₹${Math.round(s?.hotel_bookings?.revenue_this_month || 0).toLocaleString()} this month`}
          icon={IndianRupee}
          color="bg-green-500/10"
          to="/admin/bookings"
        />
      </div>

      {/* Booking Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-brand-500" /> Restaurant Bookings
            </h2>
            <Link to="/admin/bookings?type=restaurant" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Today', value: s?.restaurant_bookings?.today || 0 },
              { label: 'This Week', value: s?.restaurant_bookings?.this_week || 0 },
              { label: 'This Month', value: s?.restaurant_bookings?.this_month || 0 },
              { label: 'Total', value: s?.restaurant_bookings?.total || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-xl p-3">
                <p className="text-xl font-bold">{parseInt(value).toLocaleString()}</p>
                <p className="text-xs text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3 border-t border-white/5">
            {['confirmed', 'completed', 'cancelled'].map((status) => {
              const val = parseInt(s?.restaurant_bookings?.[status] || 0);
              const total = parseInt(s?.restaurant_bookings?.total || 1);
              const Icon = statusIcon[status] || CheckCircle;
              return (
                <div key={status} className="flex items-center gap-3">
                  <Icon size={13} className={statusColor[status]} />
                  <span className="text-xs text-white/50 capitalize w-20">{status}</span>
                  <div className="flex-1"><MiniBar value={val} max={total} color={
                    status === 'confirmed' ? 'bg-green-500' : status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                  } /></div>
                  <span className="text-xs text-white/40 w-8 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 size={16} className="text-blue-400" /> Hotel Bookings
            </h2>
            <Link to="/admin/bookings?type=hotel" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Today', value: s?.hotel_bookings?.today || 0 },
              { label: 'This Week', value: s?.hotel_bookings?.this_week || 0 },
              { label: 'Confirmed', value: s?.hotel_bookings?.confirmed || 0 },
              { label: 'Total', value: s?.hotel_bookings?.total || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-xl p-3">
                <p className="text-xl font-bold">{parseInt(value).toLocaleString()}</p>
                <p className="text-xs text-white/40 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3 border-t border-white/5">
            {['confirmed', 'completed', 'cancelled'].map((status) => {
              const val = parseInt(s?.hotel_bookings?.[status] || 0);
              const total = parseInt(s?.hotel_bookings?.total || 1);
              const Icon = statusIcon[status] || CheckCircle;
              return (
                <div key={status} className="flex items-center gap-3">
                  <Icon size={13} className={statusColor[status]} />
                  <span className="text-xs text-white/50 capitalize w-20">{status}</span>
                  <div className="flex-1"><MiniBar value={val} max={total} color={
                    status === 'confirmed' ? 'bg-green-500' : status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                  } /></div>
                  <span className="text-xs text-white/40 w-8 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7-day Activity Chart */}
      <div className="card p-6">
        <h2 className="font-semibold mb-6">Last 7 Days Activity</h2>
        <div className="flex items-end gap-3 h-40">
          {s?.last7days?.map((day) => {
            const rH = maxDay > 0 ? (day.restaurant_bookings / maxDay) * 100 : 0;
            const hH = maxDay > 0 ? (day.hotel_bookings / maxDay) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-1 h-28">
                  <div className="flex-1 bg-brand-500/60 rounded-t-lg transition-all duration-500 hover:bg-brand-500 relative group"
                    style={{ height: `${Math.max(rH, 2)}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-600 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      🍽️ {day.restaurant_bookings}
                    </div>
                  </div>
                  <div className="flex-1 bg-blue-500/60 rounded-t-lg transition-all duration-500 hover:bg-blue-500 relative group"
                    style={{ height: `${Math.max(hH, 2)}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-600 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      🏨 {day.hotel_bookings}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/30">{format(new Date(day.date), 'MMM d')}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-3 h-3 rounded bg-brand-500/60" /> Restaurants
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-3 h-3 rounded bg-blue-500/60" /> Hotels
          </div>
        </div>
      </div>

      {/* User Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-5">User Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Diners', value: s?.users?.diners, color: 'bg-violet-500', total: s?.users?.total },
              { label: 'Restaurant Owners', value: s?.users?.restaurant_owners, color: 'bg-brand-500', total: s?.users?.total },
              { label: 'Hotel Owners', value: s?.users?.hotel_owners, color: 'bg-blue-500', total: s?.users?.total },
              { label: 'Admins', value: s?.users?.admins, color: 'bg-amber-500', total: s?.users?.total },
            ].map(({ label, value, color, total }) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/60">{label}</span>
                    <span className="font-medium">{parseInt(value || 0)} <span className="text-white/30 text-xs">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-dark-600 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-5">Recent Activity</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {s?.recent_activity?.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No activity yet</p>
            ) : s?.recent_activity?.map((a) => {
              const StatusIcon = statusIcon[a.status] || CheckCircle;
              return (
                <div key={`${a.type}-${a.id}`} className="flex items-center gap-3 text-sm">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    a.type === 'restaurant_booking' ? 'bg-brand-500/20' : 'bg-blue-500/20'
                  }`}>
                    {a.type === 'restaurant_booking' ? <UtensilsCrossed size={12} className="text-brand-400" /> : <Building2 size={12} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate"><span className="font-medium">{a.user_name}</span> booked <span className="text-white/60">{a.entity_name}</span></p>
                    <p className="text-xs text-white/30">{format(new Date(a.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <StatusIcon size={13} className={statusColor[a.status] || 'text-white/40'} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending approvals alert */}
      {(parseInt(s?.restaurants?.pending) > 0 || parseInt(s?.hotels?.pending) > 0) && (
        <div className="glass rounded-2xl p-4 border border-amber-500/30 flex items-center gap-4">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Pending Approvals</p>
            <p className="text-xs text-white/50 mt-0.5">
              {s?.restaurants?.pending > 0 && `${s.restaurants.pending} restaurant(s)`}
              {s?.restaurants?.pending > 0 && s?.hotels?.pending > 0 && ' and '}
              {s?.hotels?.pending > 0 && `${s.hotels.pending} hotel(s)`}
              {' waiting for review'}
            </p>
          </div>
          <div className="flex gap-2">
            {s?.restaurants?.pending > 0 && <Link to="/admin/restaurants?status=pending" className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors">Review Restaurants</Link>}
            {s?.hotels?.pending > 0 && <Link to="/admin/hotels?status=pending" className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors">Review Hotels</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
