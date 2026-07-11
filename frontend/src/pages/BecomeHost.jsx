import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';

const HOST_TYPES = [
  {
    role: 'restaurant_owner',
    icon: UtensilsCrossed,
    title: 'Restaurant',
    desc: 'List your restaurant, manage tables, bookings, menus and reviews.',
    color: 'brand',
    cls: 'border-brand-500/30 hover:border-brand-500 bg-brand-500/5',
    iconCls: 'bg-brand-500/20 text-brand-400',
    redirect: '/dashboard/register-restaurant',
  },
  {
    role: 'hotel_owner',
    icon: Building2,
    title: 'Hotel',
    desc: 'List your hotel, manage rooms, bookings and guest reviews.',
    color: 'blue',
    cls: 'border-blue-500/30 hover:border-blue-500 bg-blue-500/5',
    iconCls: 'bg-blue-500/20 text-blue-400',
    redirect: '/hotel-dashboard/register',
  },
];

export default function BecomeHost() {
  const { googleLogin } = useAuth();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);

  const config = HOST_TYPES.find((h) => h.role === selected);

  const handleGoogle = async (credential) => {
    try {
      const user = await googleLogin(credential, selected);
      toast.success(`Welcome aboard, ${user.name.split(' ')[0]}!`);
      window.location.replace(config.redirect);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg animate-slide-up">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 badge bg-brand-500/20 text-brand-400 mb-4 text-sm px-4 py-2">
            Become a Host
          </div>
          <h1 className="text-3xl font-bold">List your property</h1>
          <p className="text-white/50 mt-2 text-sm">Join thousands of hosts on {APP_NAME}</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 max-w-xs mx-auto">
          {['Choose type', 'Sign in'].map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-500/30' : 'bg-dark-600 text-white/40'
              }`}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-white/40'}`}>{label}</span>
              {i < 1 && <div className={`flex-1 h-px ${i < step ? 'bg-brand-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0 — Choose type */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-center text-white/60 text-sm mb-6">What are you listing?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOST_TYPES.map(({ role, icon: Icon, title, desc, cls, iconCls }) => (
                <button
                  key={role}
                  onClick={() => setSelected(role)}
                  className={`card p-6 text-left border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${cls} ${
                    selected === role ? (role === 'restaurant_owner' ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-blue-500 ring-2 ring-blue-500/20') : ''
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconCls}`}>
                    <Icon size={22} />
                  </div>
                  <p className="font-semibold text-base mb-1">{title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => { if (!selected) return toast.error('Please select a listing type'); setStep(1); }}
              className="btn-primary w-full mt-6"
            >
              Continue
            </button>

            <p className="text-center text-sm text-white/40 mt-4">
              Already a host?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
            </p>
          </div>
        )}

        {/* Step 1 — Google sign-in */}
        {step === 1 && (
          <div className="card p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${config.iconCls}`}>
                <config.icon size={26} />
              </div>
              <h2 className="text-xl font-bold">Continue as {config.title} Owner</h2>
              <p className="text-white/50 text-sm mt-2">Sign in with Google to create your host account</p>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={({ credential }) => handleGoogle(credential)}
                onError={() => toast.error('Google sign-in failed')}
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
                width="320"
              />
            </div>

            <p className="text-xs text-white/30 text-center">
              By continuing, you agree to {APP_NAME}'s terms. Your Google account email must not already be registered as a diner.
            </p>

            <button
              onClick={() => setStep(0)}
              className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
