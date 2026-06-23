import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UtensilsCrossed, Building2,
  CalendarDays, ShieldCheck, LogOut, ChevronRight, Menu, X, Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { to: '/admin/hotels', label: 'Hotels', icon: Building2 },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const close = () => setOpen(false);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Admin Panel</p>
            <p className="text-xs text-white/40">TableSpot</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                isActive
                  ? 'bg-violet-500/20 text-violet-300 font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-violet-400' : ''} />
                {label}
                {isActive && <ChevronRight size={14} className="ml-auto text-violet-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-dark-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-dark-800 border-r border-white/5 flex-col fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-dark-800 border-r border-white/5 flex flex-col animate-fade-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-64 overflow-auto min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 glass border-b border-white/5 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-500 rounded-lg flex items-center justify-center">
              <ShieldCheck size={12} className="text-white" />
            </div>
            <span className="font-semibold text-sm">Admin Panel</span>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
