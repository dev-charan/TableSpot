import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, Mail, Lock, Camera, ShieldCheck, UtensilsCrossed, Building2, Calendar, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const roleLabel = {
  user: { label: 'Diner', color: 'bg-white/10 text-white/60', icon: User },
  restaurant_owner: { label: 'Restaurant Owner', color: 'bg-brand-500/20 text-brand-400', icon: UtensilsCrossed },
  hotel_owner: { label: 'Hotel Owner', color: 'bg-blue-500/20 text-blue-400', icon: Building2 },
  admin: { label: 'Admin', color: 'bg-violet-500/20 text-violet-400', icon: ShieldCheck },
};

export default function Profile() {
  const { user: authUser, refreshUser } = useAuth();
  const qc = useQueryClient();
  const avatarRef = useRef();

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  const { data: bookingStats } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const [rest, hotel] = await Promise.all([
        api.get('/bookings/mine').then((r) => r.data),
        api.get('/hotel-bookings/mine').then((r) => r.data),
      ]);
      return { restaurant: rest.length, hotel: hotel.length };
    },
  });

  const profileMutation = useMutation({
    mutationFn: (formData) => api.patch('/auth/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      toast.success('Profile updated');
      refreshUser();
      qc.invalidateQueries(['profile']);
      setAvatarPreview(null);
      setAvatarFile(null);
      setEditingProfile(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.patch('/auth/me', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setEditingProfile(true);
  };

  const handleProfileSave = () => {
    if (!profileForm.name.trim()) return toast.error('Name is required');
    const fd = new FormData();
    fd.append('name', profileForm.name);
    fd.append('phone', profileForm.phone);
    if (avatarFile) fd.append('avatar', avatarFile);
    profileMutation.mutate(fd);
  };

  const handlePasswordChange = () => {
    if (!passwordForm.current_password) return toast.error('Enter your current password');
    if (passwordForm.new_password.length < 6) return toast.error('New password must be at least 6 characters');
    if (passwordForm.new_password !== passwordForm.confirm_password) return toast.error('Passwords do not match');
    passwordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-dark-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  const roleCfg = roleLabel[user?.role] || roleLabel.user;
  const RoleIcon = roleCfg.icon;
  const avatarSrc = avatarPreview || (user?.avatar ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${user.avatar}` : null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Avatar + identity */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-violet-500/20 flex items-center justify-center text-3xl font-bold text-violet-400 shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center hover:bg-brand-600 transition-colors"
              title="Change photo"
            >
              <Camera size={13} className="text-white" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold truncate">{user?.name}</p>
            <p className="text-sm text-white/50 truncate">{user?.email}</p>
            <span className={`badge text-xs mt-2 inline-flex items-center gap-1 ${roleCfg.color}`}>
              <RoleIcon size={11} /> {roleCfg.label}
            </span>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-white/40">Member since</p>
            <p className="text-sm font-medium">{user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : '—'}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
          <div className="text-center">
            <p className="text-xl font-bold">{(bookingStats?.restaurant || 0) + (bookingStats?.hotel || 0)}</p>
            <p className="text-xs text-white/40 mt-0.5">Total Bookings</p>
          </div>
          <div className="text-center border-x border-white/5">
            <p className="text-xl font-bold">{bookingStats?.restaurant || 0}</p>
            <p className="text-xs text-white/40 mt-0.5">Restaurant</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{bookingStats?.hotel || 0}</p>
            <p className="text-xs text-white/40 mt-0.5">Hotel</p>
          </div>
        </div>

        {user?.no_show_count > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-orange-400 glass rounded-xl px-3 py-2 border border-orange-500/20">
            <AlertTriangle size={13} />
            {user.no_show_count} no-show{user.no_show_count > 1 ? 's' : ''} recorded on your account
          </div>
        )}
      </div>

      {/* Edit profile */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><User size={16} className="text-brand-500" /> Personal Info</h2>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Full Name</label>
          <input
            value={profileForm.name}
            onChange={(e) => { setProfileForm((f) => ({ ...f, name: e.target.value })); setEditingProfile(true); }}
            className="input text-sm"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Email</label>
          <div className="flex items-center gap-2 input text-sm text-white/40 cursor-not-allowed">
            <Mail size={14} className="text-white/30 shrink-0" />
            {user?.email}
          </div>
          <p className="text-xs text-white/30 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Phone (optional)</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={profileForm.phone}
              onChange={(e) => { setProfileForm((f) => ({ ...f, phone: e.target.value })); setEditingProfile(true); }}
              className="input pl-9 text-sm"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {(editingProfile || avatarFile) && (
          <div className="flex gap-2 pt-1">
            <button onClick={handleProfileSave} disabled={profileMutation.isPending}
              className="btn-primary text-sm flex items-center gap-2">
              <Check size={14} /> {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => {
              setEditingProfile(false);
              setAvatarPreview(null);
              setAvatarFile(null);
              setProfileForm({ name: user?.name || '', phone: user?.phone || '' });
            }} className="btn-ghost text-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Lock size={16} className="text-brand-500" /> Change Password</h2>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
              className="input text-sm pr-10"
              placeholder="Enter current password"
            />
            <button onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
              className="input text-sm pr-10"
              placeholder="Minimum 6 characters"
            />
            <button onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Confirm New Password</label>
          <input
            type="password"
            value={passwordForm.confirm_password}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))}
            className={`input text-sm ${passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password ? 'border-red-500/50' : ''}`}
            placeholder="Re-enter new password"
          />
          {passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button onClick={handlePasswordChange} disabled={passwordMutation.isPending}
          className="btn-primary text-sm">
          {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
