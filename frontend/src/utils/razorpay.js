import api from '../api/axios';

// Loads the Razorpay checkout script dynamically (idempotent).
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay checkout and resolves with payment_id after verification.
 * Returns null if payment is not required (free booking).
 *
 * @param {{ booking_type: 'restaurant'|'hotel', booking_amount: number, party_size?: number, entity_id: string, user: object }} opts
 */
export async function initiatePayment({ booking_type, booking_amount, party_size = 1, entity_id, user }) {
  const { data: order } = await api.post('/payments/create-order', {
    booking_type,
    booking_amount,
    party_size,
    entity_id,
  });

  if (order.skip_payment) return null;

  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error('Razorpay SDK failed to load');

  return new Promise((resolve, reject) => {
    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: order.breakdown.business_name || 'SmartAtithi',
      description: booking_type === 'hotel' ? 'Hotel Booking Fee' : 'Restaurant Booking Fee',
      order_id: order.order_id,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
      },
      theme: { color: '#f97316' },
      handler: async (response) => {
        try {
          await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            payment_id: order.payment_id,
          });
          resolve({ payment_id: order.payment_id, breakdown: order.breakdown });
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}
