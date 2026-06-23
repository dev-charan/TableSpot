import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, MapPin, Loader2, Check, Upload, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import MapPicker from '../../components/MapPicker';

const steps = ['Basic Info', 'Location', 'Details', 'Photos'];

export default function RegisterRestaurant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', cuisine_type: '', address: '', city: '',
    state: '', country: 'India', lat: '', lng: '', phone: '', website: '',
    price_range: '2', osm_id: '',
    opening_hours: JSON.stringify({ open: '11:00', close: '23:00' }),
  });
  const [coverImage, setCoverImage] = useState(null);
  const [images, setImages] = useState([]);
  const [mapPos, setMapPos] = useState(null);

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const autofill = async () => {
    if (!form.name || !form.city) return toast.error('Enter name and city first');
    setAutoFilling(true);
    try {
      const { data } = await api.get('/restaurants/autofill', { params: { name: form.name, city: form.city } });
      if (data.found) {
        setForm((prev) => ({ ...prev, ...data }));
        setMapPos({ lat: data.lat, lng: data.lng });
        setAutoFilled(true);
        toast.success('Restaurant info auto-filled from OpenStreetMap!');
      } else {
        toast('Restaurant not found on OSM. Fill manually.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Auto-fill failed');
    }
    setAutoFilling(false);
  };

  const createMutation = useMutation({
    mutationFn: (formData) => api.post('/restaurants', formData),
    onSuccess: (res) => {
      toast.success('Restaurant registered!');
      navigate(`/dashboard`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create restaurant'),
  });

  const handleSubmit = () => {
    if (!form.name || !form.address || !form.city) return toast.error('Fill all required fields');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (mapPos) { fd.set('lat', mapPos.lat); fd.set('lng', mapPos.lng); }
    if (coverImage) fd.append('cover_image', coverImage);
    images.forEach((img) => fd.append('images', img));

    createMutation.mutate(fd);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Register Your Restaurant</h1>
      <p className="text-white/50 text-sm mb-8">Fill in the details or use auto-fill to import from OpenStreetMap</p>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-500/30' : 'bg-dark-600 text-white/40'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-white/40'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-brand-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm text-white/60 mb-1.5 block">Restaurant Name *</label>
                <input value={form.name} onChange={f('name')} className="input" placeholder="The Grand Bistro" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">City *</label>
                <input value={form.city} onChange={f('city')} className="input" placeholder="Mumbai" />
              </div>
            </div>

            <button onClick={autofill} disabled={autoFilling} className="btn-ghost w-full flex items-center justify-center gap-2">
              {autoFilling ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {autoFilling ? 'Auto-filling from OpenStreetMap...' : 'Auto-fill from OpenStreetMap'}
              {autoFilled && <Check size={14} className="text-green-400" />}
            </button>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={f('description')} className="input resize-none" rows={3} placeholder="Tell guests what makes your restaurant special..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Cuisine Type</label>
                <input value={form.cuisine_type} onChange={f('cuisine_type')} className="input" placeholder="Indian, Italian..." />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Price Range</label>
                <select value={form.price_range} onChange={f('price_range')} className="input">
                  <option value="1">₹ Budget</option>
                  <option value="2">₹₹ Mid-range</option>
                  <option value="3">₹₹₹ Premium</option>
                  <option value="4">₹₹₹₹ Fine Dining</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Address *</label>
              <input value={form.address} onChange={f('address')} className="input" placeholder="123 Main Street, Fort" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">State</label>
                <input value={form.state} onChange={f('state')} className="input" placeholder="Maharashtra" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Country</label>
                <input value={form.country} onChange={f('country')} className="input" />
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Pin Location on Map <span className="text-white/30">(click to set)</span>
              </label>
              <MapPicker
                lat={mapPos?.lat || form.lat}
                lng={mapPos?.lng || form.lng}
                onPick={(pos) => setMapPos(pos)}
                height="280px"
              />
              {mapPos && (
                <p className="text-xs text-white/40 mt-1">
                  {mapPos.lat.toFixed(6)}, {mapPos.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Phone</label>
                <input value={form.phone} onChange={f('phone')} className="input" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Website</label>
                <input value={form.website} onChange={f('website')} className="input" placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Opening Time</label>
                <input
                  type="time"
                  value={JSON.parse(form.opening_hours).open}
                  onChange={(e) => setForm({ ...form, opening_hours: JSON.stringify({ ...JSON.parse(form.opening_hours), open: e.target.value }) })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Closing Time</label>
                <input
                  type="time"
                  value={JSON.parse(form.opening_hours).close}
                  onChange={(e) => setForm({ ...form, opening_hours: JSON.stringify({ ...JSON.parse(form.opening_hours), close: e.target.value }) })}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Cover Image</label>
              <label className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center cursor-pointer hover:border-brand-500/50 transition-colors">
                {coverImage ? (
                  <img src={URL.createObjectURL(coverImage)} className="w-full h-40 object-cover rounded-lg" alt="cover" />
                ) : (
                  <>
                    <Upload size={24} className="text-white/30 mb-2" />
                    <p className="text-sm text-white/50">Click to upload cover image</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverImage(e.target.files[0])} />
              </label>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Gallery Images (up to 5)</label>
              <label className="border-2 border-dashed border-white/20 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-brand-500/50 transition-colors">
                <Plus size={16} className="text-white/40" />
                <span className="text-sm text-white/50">Add gallery photos</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))} />
              </label>
              {images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {images.map((img, i) => (
                    <img key={i} src={URL.createObjectURL(img)} className="w-16 h-16 object-cover rounded-lg" alt="" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="btn-ghost disabled:opacity-30">
            Back
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary">Continue</button>
          ) : (
            <button onClick={handleSubmit} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Registering...' : 'Register Restaurant'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
