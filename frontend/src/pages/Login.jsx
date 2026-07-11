import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';

const REDIRECT = {
  user: '/',
  hotel_owner: '/hotel-dashboard',
  restaurant_owner: '/dashboard',
  admin: '/admin',
};

export default function Login() {
  const { login, googleLogin } = useAuth();
  const location = useLocation();
  const from = location.state?.from || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      window.location.replace(from || REDIRECT[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    try {
      const user = await googleLogin(credential);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      window.location.replace(from || REDIRECT[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-white/50 mt-1 text-sm">Sign in to your {APP_NAME} account</p>
        </div>

        <div className="card p-8 space-y-5">
          {/* Google sign-in */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={({ credential }) => handleGoogle(credential)}
              onError={() => toast.error('Google sign-in failed')}
              theme="filled_black"
              shape="rectangular"
              text="signin_with"
              width="352"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50">
            New here?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create an account</Link>
          </p>
          <p className="text-center text-sm text-white/50">
            Want to list your property?{' '}
            <Link to="/become-host" className="text-brand-400 hover:text-brand-300 font-medium">Become a Host</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
