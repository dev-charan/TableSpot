import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee, CheckCircle2, Clock, AlertCircle, Building2,
  UtensilsCrossed, ChevronDown, Calendar, Edit3,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const STATUS_STYLES = {
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  due: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_ICONS = {
  pending: Clock,
  due: AlertCircle,
  paid: CheckCircle2,
  failed: AlertCircle,
};

export default function AdminPayouts() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [scheduleEdit, setScheduleEdit] = useState(null); // { entity_id, entity_type, entity_name, days }
  const [payNote, setPayNote] = useState('');
  const [confirmPay, setConfirmPay] = useState(null); // payout id

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['admin-payouts', filter],
    queryFn: () =>
      api.get('/payments/payouts', { params: filter ? { status: filter } : {} }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, notes }) => api.put(`/payments/payouts/${id}/pay`, { notes }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Payout marked as paid');
      qc.invalidateQueries(['admin-payouts']);
      setConfirmPay(null);
      setPayNote('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ entity_type, entity_id, payout_schedule_days }) =>
      api.put('/payments/entity-schedule', { entity_type, entity_id, payout_schedule_days }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Payout schedule updated');
      setScheduleEdit(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const due = payouts.filter((p) => p.status === 'due').length;
  const pending = payouts.filter((p) => p.status === 'pending').length;
  const totalPending = payouts
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + parseFloat(p.net_amount), 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Payouts</h1>
          <p className="text-sm text-white/40">Hotel owner payouts from collected bookings</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-white/40 mb-1">Due Now</p>
          <p className="text-2xl font-bold text-amber-400">{due}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-white/40 mb-1">Pending</p>
          <p className="text-2xl font-bold text-blue-400">{pending}</p>
        </div>
        <div className="card p-4 col-span-2">
          <p className="text-xs text-white/40 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-white">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'due', 'pending', 'paid'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s ? 'bg-violet-500 text-white' : 'glass glass-hover text-white/50'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20 text-white/30">No payouts found</div>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => {
            const Icon = p.entity_type === 'hotel' ? Building2 : UtensilsCrossed;
            const StatusIcon = STATUS_ICONS[p.status] || Clock;
            const isOverdue = p.status === 'due';

            return (
              <div key={p.id} className={`card p-5 ${isOverdue ? 'border border-amber-500/20' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Entity info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      p.entity_type === 'hotel' ? 'bg-blue-500/20' : 'bg-brand-500/20'
                    }`}>
                      <Icon size={16} className={p.entity_type === 'hotel' ? 'text-blue-400' : 'text-brand-400'} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.entity_name}</p>
                      <p className="text-xs text-white/40 truncate">{p.owner_name} · {p.owner_email}</p>
                    </div>
                  </div>

                  {/* Amount breakdown */}
                  <div className="flex items-center gap-6 text-sm shrink-0">
                    <div className="text-center">
                      <p className="text-white/40 text-xs">Collected</p>
                      <p className="font-semibold">₹{parseFloat(p.gross_amount).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-xs">Our cut</p>
                      <p className="font-semibold text-violet-400">
                        ₹{(parseFloat(p.commission_amount) + parseFloat(p.gst_amount)).toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-xs">To pay</p>
                      <p className="font-bold text-green-400 text-base">₹{parseFloat(p.net_amount).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Status + due date */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                      <StatusIcon size={11} />
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/40">
                      <Calendar size={11} />
                      {isOverdue ? (
                        <span className="text-amber-400">Due: {format(parseISO(p.due_date), 'dd MMM yyyy')}</span>
                      ) : (
                        <span>Pay by: {format(parseISO(p.due_date), 'dd MMM yyyy')}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {p.status !== 'paid' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setScheduleEdit({
                          entity_id: p.entity_id,
                          entity_type: p.entity_type,
                          entity_name: p.entity_name,
                          days: 7,
                        })}
                        className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"
                        title="Edit payout schedule"
                      >
                        <Edit3 size={13} className="text-white/40" />
                      </button>
                      <button
                        onClick={() => setConfirmPay(p.id)}
                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors border border-green-500/20"
                      >
                        Mark Paid
                      </button>
                    </div>
                  )}
                </div>

                {p.notes && (
                  <p className="text-xs text-white/30 mt-3 pt-3 border-t border-white/5">Note: {p.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mark Paid confirmation modal */}
      {confirmPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card p-6 w-full max-w-sm space-y-4 animate-fade-in">
            <h2 className="font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" /> Confirm Payout
            </h2>
            <p className="text-sm text-white/60">Confirm that you have transferred the amount to the owner.</p>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Transfer note / reference (optional)</label>
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="input text-sm" placeholder="e.g. UPI ref #123456" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmPay(null); setPayNote(''); }} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button
                onClick={() => markPaidMutation.mutate({ id: confirmPay, notes: payNote })}
                disabled={markPaidMutation.isPending}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex-1 transition-all"
              >
                {markPaidMutation.isPending ? 'Saving...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit schedule modal */}
      {scheduleEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card p-6 w-full max-w-sm space-y-4 animate-fade-in">
            <h2 className="font-bold flex items-center gap-2">
              <Clock size={18} className="text-violet-400" /> Payout Schedule
            </h2>
            <p className="text-sm text-white/60 truncate">{scheduleEdit.entity_name}</p>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Pay owner after (days)</label>
              <input
                type="number" min="1" max="90"
                value={scheduleEdit.days}
                onChange={(e) => setScheduleEdit({ ...scheduleEdit, days: e.target.value })}
                className="input text-sm w-32"
              />
              <p className="text-[11px] text-white/30 mt-1">This applies to future bookings for this {scheduleEdit.entity_type}.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScheduleEdit(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button
                onClick={() => scheduleMutation.mutate({
                  entity_type: scheduleEdit.entity_type,
                  entity_id: scheduleEdit.entity_id,
                  payout_schedule_days: parseInt(scheduleEdit.days, 10),
                })}
                disabled={scheduleMutation.isPending}
                className="btn-primary flex-1 text-sm"
              >
                {scheduleMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
