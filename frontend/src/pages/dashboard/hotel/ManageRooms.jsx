import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Edit3, Check, X, BedDouble } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

const ROOM_AMENITIES = ['AC', 'TV', 'WiFi', 'Mini Bar', 'Balcony', 'Sea View', 'Bathtub', 'Kitchenette', 'Safe', 'Hair Dryer'];

export default function ManageRooms() {
  const { hotelId } = useOutletContext();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [newRoom, setNewRoom] = useState({
    name: '', description: '', price_per_night: '', max_occupancy: 2, total_rooms: 1, amenities: [],
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['room-types', hotelId],
    queryFn: () => api.get(`/rooms/${hotelId}`).then((r) => r.data),
    enabled: !!hotelId,
  });

  const invalidate = () => qc.invalidateQueries(['room-types', hotelId]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, k === 'amenities' ? JSON.stringify(v) : v));
      return api.post(`/rooms/${hotelId}`, fd);
    },
    onSuccess: () => { toast.success('Room type added'); invalidate(); setShowAdd(false); setNewRoom({ name: '', description: '', price_per_night: '', max_occupancy: 2, total_rooms: 1, amenities: [] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/rooms/${id}`, data),
    onSuccess: () => { toast.success('Updated'); invalidate(); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
  });

  const toggleAmenity = (a, field = 'amenities') => setNewRoom((prev) => ({
    ...prev,
    amenities: prev.amenities.includes(a) ? prev.amenities.filter((x) => x !== a) : [...prev.amenities, a],
  }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Room Types</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all">
          <Plus size={14} /> Add Room Type
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <h3 className="font-medium">New Room Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/50 mb-1 block">Room Name *</label>
              <input value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} className="input text-sm" placeholder="Deluxe Room, Suite, Standard..." />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Price/Night (₹) *</label>
              <input type="number" value={newRoom.price_per_night} onChange={(e) => setNewRoom({ ...newRoom, price_per_night: e.target.value })} className="input text-sm" placeholder="2500" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Total Rooms</label>
              <input type="number" min={1} value={newRoom.total_rooms} onChange={(e) => setNewRoom({ ...newRoom, total_rooms: e.target.value })} className="input text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Max Guests</label>
              <input type="number" min={1} value={newRoom.max_occupancy} onChange={(e) => setNewRoom({ ...newRoom, max_occupancy: e.target.value })} className="input text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/50 mb-1 block">Description</label>
              <textarea value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} className="input text-sm resize-none" rows={2} />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-2 block">Room Amenities</label>
            <div className="flex flex-wrap gap-2">
              {ROOM_AMENITIES.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    newRoom.amenities.includes(a) ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'border-white/10 text-white/40'
                  }`}>{a}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(newRoom)} disabled={!newRoom.name || !newRoom.price_per_night}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">Add Room Type</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-white/40">No room types yet. Add one to start accepting bookings.</div>
        ) : rooms.map((room) => (
          <div key={room.id} className="card p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <BedDouble size={18} className="text-blue-400" />
                <span className="font-semibold">{room.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditId(room.id); setEditValues({}); }} className="text-white/40 hover:text-white transition-colors"><Edit3 size={14} /></button>
                <button onClick={() => deleteMutation.mutate(room.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-white/50">
              <p>₹{Math.round(room.price_per_night).toLocaleString()} per night</p>
              <p>{room.total_rooms} room{room.total_rooms > 1 ? 's' : ''} • Max {room.max_occupancy} guests</p>
            </div>
            {room.amenities?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-3">
                {room.amenities.map((a) => (
                  <span key={a} className="badge bg-white/5 text-white/40 text-[10px]">{a}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <div className={`w-2 h-2 rounded-full ${room.is_available ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-white/40">{room.is_available ? 'Available' : 'Unavailable'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
