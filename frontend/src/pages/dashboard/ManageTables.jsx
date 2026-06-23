import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Edit3, Check, X, CalendarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../api/axios';

export default function ManageTables() {
  const { restaurantId } = useOutletContext();
  const qc = useQueryClient();
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBlackout, setShowBlackout] = useState(false);
  const [newTable, setNewTable] = useState({ table_number: '', capacity: 2, location: 'indoor' });
  const [blackoutForm, setBlackoutForm] = useState({ blackout_date: '', reason: '' });
  const [editValues, setEditValues] = useState({});

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => api.get(`/tables/${restaurantId}`).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const { data: blackouts = [] } = useQuery({
    queryKey: ['blackouts', restaurantId],
    queryFn: () => api.get(`/tables/${restaurantId}/blackout`).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const invalidate = () => {
    qc.invalidateQueries(['tables', restaurantId]);
    qc.invalidateQueries(['blackouts', restaurantId]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/tables/${restaurantId}`, data),
    onSuccess: () => { toast.success('Table added'); invalidate(); setShowAdd(false); setNewTable({ table_number: '', capacity: 2, location: 'indoor' }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/tables/${id}`, data),
    onSuccess: () => { toast.success('Updated'); invalidate(); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`),
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
  });

  const blackoutMutation = useMutation({
    mutationFn: (data) => api.post(`/tables/${restaurantId}/blackout`, data),
    onSuccess: () => { toast.success('Blackout date added'); invalidate(); setBlackoutForm({ blackout_date: '', reason: '' }); },
  });

  const removeBlackout = useMutation({
    mutationFn: (id) => api.delete(`/tables/blackout/${id}`),
    onSuccess: () => { invalidate(); },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tables</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowBlackout(!showBlackout)} className="btn-ghost text-sm flex items-center gap-2">
            <CalendarOff size={14} /> Blackout Dates
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> Add Table
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-5 animate-fade-in">
          <h3 className="font-medium mb-4">New Table</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Table Number</label>
              <input value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                className="input text-sm" placeholder="T1" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Capacity</label>
              <input type="number" min={1} max={20} value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                className="input text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Location</label>
              <select value={newTable.location} onChange={(e) => setNewTable({ ...newTable, location: e.target.value })} className="input text-sm">
                {['indoor', 'outdoor', 'bar', 'private'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => createMutation.mutate(newTable)} disabled={!newTable.table_number} className="btn-primary text-sm">Add</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((t) => (
          <div key={t.id} className="card p-4">
            {editId === t.id ? (
              <div className="space-y-2">
                <input value={editValues.table_number ?? t.table_number}
                  onChange={(e) => setEditValues({ ...editValues, table_number: e.target.value })}
                  className="input text-sm" />
                <input type="number" value={editValues.capacity ?? t.capacity}
                  onChange={(e) => setEditValues({ ...editValues, capacity: e.target.value })}
                  className="input text-sm" />
                <select value={editValues.location ?? t.location}
                  onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                  className="input text-sm">
                  {['indoor', 'outdoor', 'bar', 'private'].map((l) => <option key={l}>{l}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => updateMutation.mutate({ id: t.id, ...editValues })} className="text-green-400 hover:opacity-80"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="text-red-400 hover:opacity-80"><X size={16} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Table {t.table_number}</span>
                  <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <p className="text-sm text-white/50">{t.capacity} seats • {t.location}</p>
                <div className="flex items-center justify-end gap-3 mt-3">
                  <button onClick={() => { setEditId(t.id); setEditValues({}); }} className="text-white/40 hover:text-white transition-colors"><Edit3 size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(t.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showBlackout && (
        <div className="card p-5 animate-fade-in">
          <h3 className="font-medium mb-4">Closed Dates</h3>
          <div className="flex gap-3 mb-4">
            <input type="date" value={blackoutForm.blackout_date}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, blackout_date: e.target.value })}
              className="input text-sm flex-1" />
            <input value={blackoutForm.reason}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
              className="input text-sm flex-1" placeholder="Reason (optional)" />
            <button onClick={() => blackoutMutation.mutate(blackoutForm)} disabled={!blackoutForm.blackout_date} className="btn-primary text-sm">Add</button>
          </div>
          <div className="space-y-2">
            {blackouts.map((b) => (
              <div key={b.id} className="flex items-center justify-between glass rounded-xl px-4 py-2.5 text-sm">
                <span>{format(new Date(b.blackout_date), 'MMM d, yyyy')}</span>
                {b.reason && <span className="text-white/40 text-xs">{b.reason}</span>}
                <button onClick={() => removeBlackout.mutate(b.id)} className="text-red-400/50 hover:text-red-400"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
