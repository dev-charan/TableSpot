import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, Loader2, Check, Upload, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import MapPicker from '../../../components/MapPicker';

const ALL_AMENITIES = ['WiFi', 'Parking', 'Pool', 'Gym', 'Restaurant', 'Spa', 'Bar', 'Room Service', 'Laundry', 'Airport Shuttle', 'Business Center', 'Pet Friendly'];
const steps = ['Basic Info', 'Location', 'Amenities & Times', 'Photos'];

export default function RegisterHotel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [mapPos, setMapPos] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [images, setImages] = useState([]);

  const [form, setForm] = useState({
    name: '', description: '', star_rating: '3', hotel_type: 'hotel',
    address: '', city: '', state: '', country: 'India',
    lat: '', lng: '', phone: '', website: '', osm_id: '',
    check_in_time: '14:00', check_out_time: '11:00',
    amenities: [],
  });

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleAmenity = (a) => setForm((prev) => ({
    ...prev,
    amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
  }));

  const autofill = async () => {
    if (!form.name || !form.city) return toast.error('Enter name and city first');
    setAutoFilling(true);
    try {
      const { data } = await api.get('/hotels/autofill', { params: { name: form.name, city: form.city } });
      if (data.found) {
        setForm((prev) => ({ ...prev, ...data, amenities: prev.amenities }));
        setMapPos({ lat: data.lat, lng: data.lng });
        setAutoFilled(true);
        toast.success('Hotel info auto-filled from OpenStreetMap!');
      } else {
        toast('Hotel not found on OSM. Fill manually.', { icon: 'ℹ️' });
      }
    } catch { toast.error('Auto-fill failed'); }
    setAutoFilling(false);
  };

  const createMutation = useMutation({
    mutationFn: (fd) => api.post('/hotels', fd),
    onSuccess: () => { toast.success('Hotel registered!'); navigate('/hotel-dashboard'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleSubmit = () => {
    if (!form.name || !form.address || !form.city) return toast.error('Fill required fields');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'amenities') fd.append(k, JSON.stringify(v));
      else fd.append(k, v);
    });
    if (mapPos) { fd.set('lat', mapPos.lat); fd.set('lng', mapPos.lng); }
    if (coverImage) fd.append('cover_image', coverImage);
    images.forEach((img) => fd.append('images', img));
    createMutation.mutate(fd);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Register Your Hotel</h1>
      <p className="text-white/50 text-sm mb-8">Auto-fill from OpenStreetMap or enter details manually</p>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? 'bg-blue-500 text-white' : i === step ? 'bg-blue-500 text-white ring-4 ring-blue-500/30' : 'bg-dark-600 text-white/40'
            }`}>{i < step ? <Check size={14} /> : i + 1}</div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-white/40'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-blue-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm text-white/60 mb-1.5 block">Hotel Name *</label>
                <input value={form.name} onChange={f('name')} className="input" placeholder="The Grand Palace" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">City *</label>
                <input value={form.city} onChange={f('city')} className="input" placeholder="Mumbai" />
              </div>
            </div>

            <button onClick={autofill} disabled={autoFilling} className="btn-ghost w-full flex items-center justify-center gap-2">
              {autoFilling ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {autoFilling ? 'Searching OpenStreetMap...' : 'Auto-fill from OpenStreetMap'}
              {autoFilled && <Check size={14} className="text-green-400" />}
            </button>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={f('description')} className="input resize-none" rows={3} placeholder="What makes your hotel special..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Hotel Type</label>
                <select value={form.hotel_type} onChange={f('hotel_type')} className="input">
                  {['hotel', 'resort', 'hostel', 'apartment', 'villa', 'boutique'].map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Star Rating</label>
                <select value={form.star_rating} onChange={f('star_rating')} className="input">
                  {[1,2,3,4,5].map((s) => <option key={s} value={s}>{s} Star{s > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Address *</label>
              <input value={form.address} onChange={f('address')} className="input" placeholder="123 Marine Drive" />
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
              <label className="text-sm text-white/60 mb-2 block">Pin Location <span className="text-white/30">(click map to set)</span></label>
              <MapPicker lat={mapPos?.lat || form.lat} lng={mapPos?.lng || form.lng} onPick={setMapPos} height="280px" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Phone</label>
                <input value={form.phone} onChange={f('phone')} className="input" placeholder="+91 22 1234 5678" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Website</label>
                <input value={form.website} onChange={f('website')} className="input" placeholder="https://..." />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="text-sm text-white/60 mb-3 block">Amenities</label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_AMENITIES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={`py-2 px-3 rounded-xl text-sm transition-all border ${
                      form.amenities.includes(a)
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Check-in Time</label>
                <input type="time" value={form.check_in_time} onChange={f('check_in_time')} className="input" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Check-out Time</label>
                <input type="time" value={form.check_out_time} onChange={f('check_out_time')} className="input" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Cover Image</label>
              <label className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center cursor-pointer hover:border-blue-500/50 transition-colors">
                {coverImage ? (
                  <img src={URL.createObjectURL(coverImage)} className="w-full h-40 object-cover rounded-lg" alt="cover" />
                ) : (
                  <><Upload size={24} className="text-white/30 mb-2" /><p className="text-sm text-white/50">Click to upload cover image</p></>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverImage(e.target.files[0])} />
              </label>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Gallery (up to 8 photos)</label>
              <label className="border-2 border-dashed border-white/20 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors">
                <Plus size={16} className="text-white/40" />
                <span className="text-sm text-white/50">Add gallery photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages(Array.from(e.target.files).slice(0, 8))} />
              </label>
              {images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {images.map((img, i) => <img key={i} src={URL.createObjectURL(img)} className="w-16 h-16 object-cover rounded-lg" alt="" />)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="btn-ghost disabled:opacity-30">Back</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">Continue</button>
          ) : (
            <button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">
              {createMutation.isPending ? 'Registering...' : 'Register Hotel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
