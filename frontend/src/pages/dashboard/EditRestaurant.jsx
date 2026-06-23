import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Save, X, MapPin, Phone, Globe, Clock, Image, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import MapPicker from '../../components/MapPicker';
import { SERVER_URL } from '../../config';

const SECTIONS = ['Basic Info', 'Location', 'Contact & Hours', 'Photos'];

const BASE = SERVER_URL;

export default function EditRestaurant() {
  const { restaurants, restaurantId } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const coverRef = useRef();
  const galleryRef = useRef();

  const restaurant = restaurants?.find((r) => r.id === restaurantId) || restaurants?.[0];

  const [form, setForm] = useState({
    name: '', description: '', cuisine_type: '', price_range: '2',
    address: '', city: '', state: '', country: 'India', lat: '', lng: '',
    phone: '', website: '',
    opening_hours: JSON.stringify({ open: '11:00', close: '23:00' }),
  });
  const [mapPos, setMapPos] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [section, setSection] = useState(0);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name || '',
      description: restaurant.description || '',
      cuisine_type: restaurant.cuisine_type || '',
      price_range: String(restaurant.price_range || 2),
      address: restaurant.address || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      country: restaurant.country || 'India',
      lat: restaurant.lat || '',
      lng: restaurant.lng || '',
      phone: restaurant.phone || '',
      website: restaurant.website || '',
      opening_hours: restaurant.opening_hours
        ? JSON.stringify(restaurant.opening_hours)
        : JSON.stringify({ open: '11:00', close: '23:00' }),
    });
    if (restaurant.lat && restaurant.lng) {
      setMapPos({ lat: parseFloat(restaurant.lat), lng: parseFloat(restaurant.lng) });
    }
  }, [restaurant?.id]);

  const f = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Cover image must be under 5MB');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleGallery = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setGalleryFiles(files);
  };

  const mutation = useMutation({
    mutationFn: (fd) => api.patch(`/restaurants/${restaurant.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      toast.success('Restaurant updated successfully!');
      qc.invalidateQueries(['my-restaurants']);
      qc.invalidateQueries(['restaurant', restaurant.id]);
      setCoverFile(null);
      setCoverPreview(null);
      setGalleryFiles([]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Restaurant name is required');
    if (!form.address.trim()) return toast.error('Address is required');
    if (!form.city.trim()) return toast.error('City is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    if (mapPos) { fd.set('lat', mapPos.lat); fd.set('lng', mapPos.lng); }
    if (coverFile) fd.append('cover_image', coverFile);
    galleryFiles.forEach((img) => fd.append('images', img));

    mutation.mutate(fd);
  };

  if (!restaurant) return (
    <div className="p-8 text-center text-white/40">No restaurant found. Register one first.</div>
  );

  const hours = (() => { try { return JSON.parse(form.opening_hours); } catch { return { open: '11:00', close: '23:00' }; } })();
  const currentCover = restaurant.cover_image ? `${BASE}${restaurant.cover_image}` : null;
  const currentGallery = restaurant.images?.map((img) => `${BASE}${img}`) || [];

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="text-white/40 text-sm mt-1">{restaurant.name}</p>
        </div>
        <button onClick={handleSave} disabled={mutation.isPending}
          className="btn-primary flex items-center gap-2">
          <Save size={15} /> {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => setSection(i)}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${section === i ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Section 0: Basic Info */}
      {section === 0 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold flex items-center gap-2 text-sm text-white/60 uppercase tracking-wider"><Info size={14} /> Basic Info</h2>

          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Restaurant Name *</label>
            <input value={form.name} onChange={f('name')} className="input" placeholder="The Grand Bistro" />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={f('description')} className="input resize-none" rows={4}
              placeholder="Tell guests what makes your restaurant special..." />
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

      {/* Section 1: Location */}
      {section === 1 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold flex items-center gap-2 text-sm text-white/60 uppercase tracking-wider"><MapPin size={14} /> Location</h2>

          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Address *</label>
            <input value={form.address} onChange={f('address')} className="input" placeholder="123 Main Street, Fort" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">City *</label>
              <input value={form.city} onChange={f('city')} className="input" placeholder="Mumbai" />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">State</label>
              <input value={form.state} onChange={f('state')} className="input" placeholder="Maharashtra" />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">
              Pin Location <span className="text-white/30 font-normal">(click on map to reposition)</span>
            </label>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <MapPicker
                lat={mapPos?.lat || parseFloat(form.lat) || 19.076}
                lng={mapPos?.lng || parseFloat(form.lng) || 72.8777}
                onPick={(pos) => setMapPos(pos)}
                height="280px"
              />
            </div>
            {mapPos && (
              <p className="text-xs text-white/40 mt-1.5 flex items-center gap-1">
                <MapPin size={11} /> {mapPos.lat.toFixed(6)}, {mapPos.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Contact & Hours */}
      {section === 2 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold flex items-center gap-2 text-sm text-white/60 uppercase tracking-wider"><Clock size={14} /> Contact & Hours</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1"><Phone size={12} /> Phone</label>
              <input value={form.phone} onChange={f('phone')} className="input" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1"><Globe size={12} /> Website</label>
              <input value={form.website} onChange={f('website')} className="input" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-3 block">Opening Hours</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Opens at</label>
                <input type="time" value={hours.open}
                  onChange={(e) => setForm((prev) => ({ ...prev, opening_hours: JSON.stringify({ ...hours, open: e.target.value }) }))}
                  className="input" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Closes at</label>
                <input type="time" value={hours.close}
                  onChange={(e) => setForm((prev) => ({ ...prev, opening_hours: JSON.stringify({ ...hours, close: e.target.value }) }))}
                  className="input" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Photos */}
      {section === 3 && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <h2 className="font-semibold flex items-center gap-2 text-sm text-white/60 uppercase tracking-wider"><Image size={14} /> Photos</h2>

          {/* Cover image */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Cover Image</label>
            <div className="relative">
              <div className="w-full h-48 rounded-xl overflow-hidden bg-dark-700 flex items-center justify-center border-2 border-dashed border-white/10">
                {coverPreview || currentCover ? (
                  <img src={coverPreview || currentCover} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload size={24} className="text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/40">No cover image</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => coverRef.current?.click()}
                  className="btn-ghost text-xs flex items-center gap-1.5">
                  <Upload size={12} /> {currentCover ? 'Replace Cover' : 'Upload Cover'}
                </button>
                {coverPreview && (
                  <button onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                    <X size={12} /> Remove new
                  </button>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </div>
          </div>

          {/* Gallery */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Gallery Images</label>

            {currentGallery.length > 0 && galleryFiles.length === 0 && (
              <div className="mb-3">
                <p className="text-xs text-white/40 mb-2">Current gallery</p>
                <div className="flex gap-2 flex-wrap">
                  {currentGallery.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                  ))}
                </div>
              </div>
            )}

            {galleryFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-amber-400 mb-2">New gallery (will replace current)</p>
                <div className="flex gap-2 flex-wrap">
                  {galleryFiles.map((f, i) => (
                    <img key={i} src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-xl border border-brand-500/40" />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => galleryRef.current?.click()}
                className="btn-ghost text-xs flex items-center gap-1.5">
                <Upload size={12} /> {currentGallery.length ? 'Replace Gallery' : 'Upload Gallery'} (up to 5)
              </button>
              {galleryFiles.length > 0 && (
                <button onClick={() => setGalleryFiles([])}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallery} />
            <p className="text-xs text-white/30 mt-1">Uploading new gallery replaces all existing gallery images</p>
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <p className="text-xs text-white/30">Changes save to your public listing immediately</p>
        <button onClick={handleSave} disabled={mutation.isPending}
          className="btn-primary flex items-center gap-2">
          <Save size={15} /> {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
