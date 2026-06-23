import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UtensilsCrossed, Building2, Menu, X, User, LogOut, LayoutDashboard, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center group-hover:bg-brand-600 transition-colors">
              <UtensilsCrossed size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Table<span className="text-brand-500">Spot</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 glass rounded-xl p-1">
            <Link to="/" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive('/') ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'}`}>
              <UtensilsCrossed size={13} /> Restaurants
            </Link>
            <Link to="/hotels" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive('/hotels') || location.pathname.startsWith('/hotel/') ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'}`}>
              <Building2 size={13} /> Hotels
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2 glass glass-hover px-3 py-2 rounded-xl text-sm"
                >
                  <div className="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl border border-white/10 overflow-hidden shadow-xl animate-fade-in">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-white/50">{user?.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                      <User size={15} /> My Profile
                    </Link>
                    <Link to="/my-bookings" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                      <LayoutDashboard size={15} /> My Bookings
                    </Link>
                    {(user?.role === 'restaurant_owner' || user?.role === 'admin') && (
                      <Link to="/dashboard" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                        <UtensilsCrossed size={15} /> Restaurant Dashboard
                      </Link>
                    )}
                    {(user?.role === 'hotel_owner' || user?.role === 'admin') && (
                      <Link to="/hotel-dashboard" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                        <Building2 size={15} /> Hotel Dashboard
                      </Link>
                    )}
                    {user?.role === 'admin' && (
                      <Link to="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-violet-400 hover:bg-violet-500/10 transition-colors">
                        <ShieldCheck size={15} /> Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm py-2">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden glass border-t border-white/10 px-4 py-4 space-y-3 animate-fade-in">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm py-2">Explore</Link>
          <Link to="/hotels" onClick={() => setMenuOpen(false)} className="block text-sm py-2">Hotels</Link>
          {isLoggedIn ? (
            <>
              <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="block text-sm py-2">My Bookings</Link>
              {(user?.role === 'restaurant_owner' || user?.role === 'admin') && (
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block text-sm py-2">Restaurant Dashboard</Link>
              )}
              {(user?.role === 'hotel_owner' || user?.role === 'admin') && (
                <Link to="/hotel-dashboard" onClick={() => setMenuOpen(false)} className="block text-sm py-2">Hotel Dashboard</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-sm py-2 text-violet-400">Admin Panel</Link>
              )}
              <button onClick={handleLogout} className="block text-sm py-2 text-red-400 w-full text-left">Sign Out</button>
            </>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost flex-1 text-center text-sm">Sign In</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 text-center text-sm">Get Started</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
