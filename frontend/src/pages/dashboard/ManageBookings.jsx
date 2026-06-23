import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const statusActions = {
  confirmed: [
    { label: 'Complete', value: 'completed', icon: CheckCircle, color: 'text-green-400' },
    { label: 'No Show', value: 'no_show', icon: AlertTriangle, color: 'text-orange-400' },
    { label: 'Cancel', value: 'cancelled', icon: XCircle, color: 'text-red-400' },
  ],
  pending: [
    { label: 'Confirm', value: 'confirmed', icon: CheckCircle, color: 'text-green-400' },
    { label: 'Cancel', value: 'cancelled', icon: XCircle, color: 'text-red-400' },
  ],
};

export default function ManageBookings() {
  const { restaurantId } = useOutletContext();
  const qc = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['restaurant-bookings', restaurantId, date, statusFilter],
    queryFn: () => api.get(`/bookings/restaurant/${restaurantId}`, { params: { date, status: statusFilter } }).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/bookings/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['restaurant-bookings']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Bookings</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input text-sm pr-4" />
        </div>
        <div className="flex gap-2">
          {['', 'confirmed', 'pending', 'completed', 'no_show', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-2 rounded-lg transition-all capitalize ${
                statusFilter === s ? 'bg-brand-500 text-white' : 'glass text-white/50 hover:text-white'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-dark-700 rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-white/40">No bookings for this date</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{b.user_name}</p>
                  {b.no_show_count > 0 && (
                    <span className="badge bg-orange-500/20 text-orange-400 text-[10px]">
                      {b.no_show_count} no-show{b.no_show_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-white/50">
                  <span>{b.time_slot}</span>
                  <span>{b.party_size} guests</span>
                  {b.table_number && <span>Table {b.table_number}</span>}
                  <span>{b.user_phone}</span>
                </div>
                {b.special_requests && (
                  <p className="text-xs text-white/40 mt-1 italic">"{b.special_requests}"</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`badge text-xs capitalize ${
                  b.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  b.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  b.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  b.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {b.status}
                </span>

                {statusActions[b.status]?.map(({ label, value, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => statusMutation.mutate({ id: b.id, status: value })}
                    className={`${color} hover:opacity-80 transition-opacity text-xs flex items-center gap-1`}
                    title={label}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
