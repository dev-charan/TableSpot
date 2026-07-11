import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';

export default function Register() {
  const { register, googleLogin } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const user = await register({ ...form, role: 'user' });
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      window.location.replace('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    try {
      const user = await googleLogin(credential);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      window.location.replace('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-up failed');
    }
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-white/50 mt-1 text-sm">Join {APP_NAME} and start booking</p>
        </div>

        <div className="card p-8 space-y-5">
          {/* Google sign-up */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={({ credential }) => handleGoogle(credential)}
              onError={() => toast.error('Google sign-up failed')}
              theme="filled_black"
              shape="rectangular"
              text="signup_with"
              width="352"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or sign up with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input value={form.name} onChange={f('name')} className="input pl-10" placeholder="John Doe" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input type="email" value={form.email} onChange={f('email')} className="input pl-10" placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Phone <span className="text-white/30 font-normal">(optional)</span></label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input value={form.phone} onChange={f('phone')} className="input pl-10" placeholder="+91 9876543210" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={f('password')}
                  className="input pl-10 pr-10"
                  placeholder="Min 6 characters"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">Sign in</Link>
          </p>
          <p className="text-center text-sm text-white/50">
            Own a restaurant or hotel?{' '}
            <Link to="/become-host" className="text-brand-400 hover:text-brand-300 font-medium">Become a Host</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
