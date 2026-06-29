import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User, Building2, UtensilsCrossed, ShieldCheck,
  Mail, Lock, Eye, EyeOff, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {
    role: 'user',
    label: 'Diner',
    desc: 'Book tables & hotels',
    icon: User,
    cardCls: 'border-brand-500/30 hover:border-brand-500/60',
    iconCls: 'bg-brand-500/20 text-brand-400',
    btnCls: 'bg-brand-500 hover:bg-brand-600',
    register: '/register?role=user',
  },
  {
    role: 'hotel_owner',
    label: 'Hotel Owner',
    desc: 'Manage your hotel',
    icon: Building2,
    cardCls: 'border-blue-500/30 hover:border-blue-500/60',
    iconCls: 'bg-blue-500/20 text-blue-400',
    btnCls: 'bg-blue-500 hover:bg-blue-600',
    register: '/register?role=hotel_owner',
  },
  {
    role: 'restaurant_owner',
    label: 'Restaurant Owner',
    desc: 'Manage your restaurant',
    icon: UtensilsCrossed,
    cardCls: 'border-amber-500/30 hover:border-amber-500/60',
    iconCls: 'bg-amber-500/20 text-amber-400',
    btnCls: 'bg-amber-500 hover:bg-amber-600',
    register: '/register?role=restaurant_owner',
  },
];

const REDIRECT = {
  user: '/',
  hotel_owner: '/hotel-dashboard',
  restaurant_owner: '/dashboard',
  admin: '/admin',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || null;

  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password, selectedRole);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      window.location.replace(from || REDIRECT[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const config = ROLES.find((r) => r.role === selectedRole);
  const isAdmin = selectedRole === 'admin';

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-white/50 mt-2 text-sm">Choose how you want to sign in</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {ROLES.map(({ role, label, desc, icon: Icon, cardCls, iconCls }) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`card p-6 text-center border transition-all hover:scale-105 active:scale-95 ${cardCls}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${iconCls}`}>
                  <Icon size={22} />
                </div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-white/40 mt-1">{desc}</p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setSelectedRole('admin')}
              className="text-xs text-white/30 hover:text-violet-400 transition-colors flex items-center gap-1.5 mx-auto"
            >
              <ShieldCheck size={12} /> Admin Login
            </button>
          </div>

          <p className="text-center text-sm text-white/40 mt-8">
            New here?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isAdmin ? 'bg-violet-500/20' : config?.iconCls}`}>
            {isAdmin ? <ShieldCheck size={28} className="text-violet-400" /> : <config.icon size={28} />}
          </div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Admin Login' : `${config?.label} Login`}</h1>
          <p className="text-white/50 mt-1 text-sm">Sign in to your TableSpot account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-semibold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
              isAdmin ? 'bg-violet-500 hover:bg-violet-600' : config?.btnCls
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {!isAdmin && (
            <p className="text-center text-sm text-white/50">
              Don't have an account?{' '}
              <Link to={config?.register} className="text-brand-400 hover:text-brand-300 font-medium">
                Register as {config?.label}
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={() => { setSelectedRole(null); setForm({ email: '', password: '' }); }}
            className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white transition-colors pt-1"
          >
            <ArrowLeft size={14} /> Back to login options
          </button>
        </form>
      </div>
    </div>
  );
}
