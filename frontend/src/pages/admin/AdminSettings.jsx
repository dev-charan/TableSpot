import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, IndianRupee, Percent, Receipt, Building2, Save, Info, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { usePaymentSettings } from '../../hooks/usePaymentSettings';

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = usePaymentSettings();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      setForm({
        is_payment_enabled: settings.is_payment_enabled ?? false,
        hotel_commission_rate: settings.hotel_commission_rate ?? 0,
        restaurant_fee_per_person: settings.restaurant_fee_per_person ?? 0,
        gst_rate: settings.gst_rate ?? 0,
        gst_number: settings.gst_number ?? '',
        business_name: settings.business_name ?? '',
        default_payout_days: settings.default_payout_days ?? 7,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/payments/settings', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Payment settings saved');
      qc.invalidateQueries(['payment-settings']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const f = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  if (isLoading || !form) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 bg-dark-700 rounded w-48 mb-6" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-dark-700 rounded-xl" />)}
    </div>
  );

  const hotelExample = form.is_payment_enabled
    ? (() => {
        const commission = (10000 * parseFloat(form.hotel_commission_rate || 0)) / 100;
        const gst = (commission * parseFloat(form.gst_rate || 0)) / 100;
        return { commission, gst, total: commission + gst };
      })()
    : null;

  const restaurantExample = form.is_payment_enabled
    ? (() => {
        const commission = parseFloat(form.restaurant_fee_per_person || 0) * 4;
        const gst = (commission * parseFloat(form.gst_rate || 0)) / 100;
        return { commission, gst, total: commission + gst };
      })()
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Payment Settings</h1>
          <p className="text-sm text-white/40">Configure commission, GST, and Razorpay integration</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Master toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold flex items-center gap-2"><ToggleLeft size={16} className="text-violet-400" /> Enable Payments</p>
              <p className="text-xs text-white/40 mt-1">When off, all bookings are free and no Razorpay checkout is shown</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_payment_enabled}
                onChange={f('is_payment_enabled')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
            </label>
          </div>
        </div>

        {/* Business Details */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Building2 size={15} className="text-violet-400" /> Business Details</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Business / Company Name</label>
            <input value={form.business_name} onChange={f('business_name')} className="input" placeholder="e.g. SmartAtithi Technologies Pvt Ltd" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">GST Number</label>
            <input value={form.gst_number} onChange={f('gst_number')} className="input" placeholder="e.g. 27AADCS0472N1Z1" />
            <p className="text-[11px] text-white/30 mt-1">Displayed on payment receipt for tax invoice purposes</p>
          </div>
        </div>

        {/* GST Rate */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Receipt size={15} className="text-violet-400" /> GST Rate</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">GST % on commission</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                value={form.gst_rate}
                onChange={f('gst_rate')}
                className="input pr-10"
                placeholder="18"
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            </div>
            <p className="text-[11px] text-white/30 mt-1">GST is calculated on top of commission. Set 0 for no GST.</p>
          </div>
        </div>

        {/* Hotel Commission */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><IndianRupee size={15} className="text-violet-400" /> Hotel Commission</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Commission % of total stay price</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.01"
                value={form.hotel_commission_rate}
                onChange={f('hotel_commission_rate')}
                className="input pr-10"
                placeholder="15"
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            </div>
            <p className="text-[11px] text-white/30 mt-1">Set 0 to charge no commission for hotel bookings.</p>
          </div>
          {form.is_payment_enabled && hotelExample && hotelExample.commission > 0 && (
            <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20 text-xs space-y-1">
              <p className="text-violet-300 font-medium flex items-center gap-1"><Info size={11} /> Example: ₹10,000 stay</p>
              <p className="text-white/50">Commission ({form.hotel_commission_rate}%): ₹{hotelExample.commission.toFixed(2)}</p>
              <p className="text-white/50">GST ({form.gst_rate}%): ₹{hotelExample.gst.toFixed(2)}</p>
              <p className="text-white font-semibold">Guest pays: ₹{hotelExample.total.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Restaurant Fee */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><IndianRupee size={15} className="text-violet-400" /> Restaurant Booking Fee</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Fee per person (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="number" min="0" step="0.01"
                value={form.restaurant_fee_per_person}
                onChange={f('restaurant_fee_per_person')}
                className="input pl-8"
                placeholder="50"
              />
            </div>
            <p className="text-[11px] text-white/30 mt-1">Charged per guest in the party. Set 0 for free restaurant bookings.</p>
          </div>
          {form.is_payment_enabled && restaurantExample && restaurantExample.commission > 0 && (
            <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20 text-xs space-y-1">
              <p className="text-violet-300 font-medium flex items-center gap-1"><Info size={11} /> Example: 4 guests</p>
              <p className="text-white/50">Fee (₹{form.restaurant_fee_per_person} × 4): ₹{restaurantExample.commission.toFixed(2)}</p>
              <p className="text-white/50">GST ({form.gst_rate}%): ₹{restaurantExample.gst.toFixed(2)}</p>
              <p className="text-white font-semibold">Guest pays: ₹{restaurantExample.total.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Payout Schedule */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Save size={15} className="text-violet-400" /> Payout Schedule</h3>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Default payout delay (days)</label>
            <input
              type="number" min="1" max="90"
              value={form.default_payout_days}
              onChange={f('default_payout_days')}
              className="input w-32"
              placeholder="7"
            />
            <p className="text-[11px] text-white/30 mt-1">After a successful hotel booking payment, owner is paid after this many days. Override per hotel in the Payouts page.</p>
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );
}
