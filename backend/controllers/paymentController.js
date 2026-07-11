const { pool } = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const email = require('../utils/email');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM payment_settings WHERE id = 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateSettings = async (req, res) => {
  const {
    is_payment_enabled, hotel_commission_rate, restaurant_fee_per_person,
    gst_rate, gst_number, business_name, default_payout_days,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE payment_settings SET
        is_payment_enabled = $1, hotel_commission_rate = $2, restaurant_fee_per_person = $3,
        gst_rate = $4, gst_number = $5, business_name = $6, default_payout_days = $7,
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [is_payment_enabled, hotel_commission_rate, restaurant_fee_per_person,
       gst_rate, gst_number, business_name, default_payout_days || 7]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/payments/create-order
// Hotel: guest pays full room price. Platform keeps commission+gst. Owner gets rest after N days.
// Restaurant: guest pays fee per person (platform service charge). No owner payout.
const createOrder = async (req, res) => {
  const { booking_type, booking_amount, party_size, entity_id } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM payment_settings WHERE id = 1');
    const s = rows[0];

    if (!s?.is_payment_enabled) return res.json({ skip_payment: true });

    let totalCharged = 0;
    let commission = 0;
    let gst = 0;
    let ownerPayout = 0;

    if (booking_type === 'hotel') {
      commission = (parseFloat(booking_amount) * parseFloat(s.hotel_commission_rate)) / 100;
      gst = (commission * parseFloat(s.gst_rate)) / 100;
      totalCharged = parseFloat(booking_amount);
      ownerPayout = totalCharged - commission - gst;
    } else {
      commission = parseFloat(s.restaurant_fee_per_person) * parseInt(party_size, 10);
      gst = (commission * parseFloat(s.gst_rate)) / 100;
      totalCharged = commission + gst;
      ownerPayout = 0;
    }

    if (totalCharged <= 0) return res.json({ skip_payment: true });

    const amountInPaise = Math.round(totalCharged * 100);
    const order = await razorpay.orders.create({
      amount: amountInPaise, currency: 'INR', receipt: `rcpt_${Date.now()}`,
    });

    const { rows: payRows } = await pool.query(
      `INSERT INTO payments
        (user_id, booking_type, entity_id, entity_type, razorpay_order_id,
         booking_amount, commission_amount, gst_amount, total_amount, commission_rate, gst_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        req.user.id, booking_type, entity_id || null, booking_type, order.id,
        booking_amount, commission.toFixed(2), gst.toFixed(2), totalCharged.toFixed(2),
        booking_type === 'hotel' ? s.hotel_commission_rate : s.restaurant_fee_per_person,
        s.gst_rate,
      ]
    );

    res.json({
      order_id: order.id,
      amount: amountInPaise,
      currency: 'INR',
      payment_id: payRows[0].id,
      key_id: process.env.RAZORPAY_KEY_ID,
      breakdown: {
        booking_amount: parseFloat(booking_amount || 0),
        commission: parseFloat(commission.toFixed(2)),
        gst: parseFloat(gst.toFixed(2)),
        total: parseFloat(totalCharged.toFixed(2)),
        owner_payout: parseFloat(ownerPayout.toFixed(2)),
        commission_rate: parseFloat(s.hotel_commission_rate),
        restaurant_fee_per_person: parseFloat(s.restaurant_fee_per_person),
        gst_rate: parseFloat(s.gst_rate),
        gst_number: s.gst_number,
        business_name: s.business_name,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = req.body;
  try {
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      await pool.query("UPDATE payments SET status = 'failed' WHERE id = $1", [payment_id]);
      return res.status(400).json({ message: 'Payment verification failed. Signature mismatch.' });
    }

    await pool.query(
      "UPDATE payments SET status = 'paid', razorpay_payment_id = $1, razorpay_signature = $2 WHERE id = $3",
      [razorpay_payment_id, razorpay_signature, payment_id]
    );

    // Create payout record for hotel bookings
    const { rows: payRows } = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
    const payment = payRows[0];

    if (payment?.entity_type === 'hotel' && payment.entity_id) {
      const { rows: hotelRows } = await pool.query(
        `SELECT h.*, u.name as owner_name, u.email as owner_email
         FROM hotels h JOIN users u ON u.id = h.owner_id WHERE h.id = $1`,
        [payment.entity_id]
      );
      const hotel = hotelRows[0];
      if (hotel) {
        const { rows: setRows } = await pool.query('SELECT default_payout_days FROM payment_settings WHERE id = 1');
        const defaultDays = setRows[0]?.default_payout_days || 7;
        const payoutDays = hotel.payout_schedule_days || defaultDays;

        const gross = parseFloat(payment.total_amount);
        const commission = parseFloat(payment.commission_amount);
        const gst = parseFloat(payment.gst_amount);
        const net = gross - commission - gst;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + payoutDays);

        await pool.query(
          `INSERT INTO payouts
            (payment_id, owner_id, owner_name, owner_email, entity_type, entity_id, entity_name,
             gross_amount, commission_amount, gst_amount, net_amount, due_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            payment_id, hotel.owner_id, hotel.owner_name, hotel.owner_email,
            'hotel', hotel.id, hotel.name,
            gross, commission, gst, net.toFixed(2),
            dueDate.toISOString().split('T')[0],
          ]
        );
      }
    }

    // Send payment receipt email
    const { rows: userRows } = await pool.query('SELECT name, email FROM users WHERE id = $1', [payment.user_id]);
    const guest = userRows[0];
    if (guest && payment) {
      const entityName = payment.entity_type === 'hotel'
        ? (await pool.query('SELECT name FROM hotels WHERE id = $1', [payment.entity_id])).rows[0]?.name
        : (await pool.query('SELECT name FROM restaurants WHERE id = $1', [payment.entity_id])).rows[0]?.name;
      const { rows: setRows } = await pool.query('SELECT gst_number, business_name FROM payment_settings WHERE id = 1');
      const ref = payment.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      email.paymentReceipt(guest.email, {
        entityName: entityName || 'Booking',
        ref,
        bookingType: payment.entity_type,
        breakdown: {
          booking_amount: parseFloat(payment.booking_amount),
          commission: parseFloat(payment.commission_amount),
          gst: parseFloat(payment.gst_amount),
          total: parseFloat(payment.total_amount),
          commission_rate: parseFloat(payment.commission_rate),
          gst_rate: parseFloat(payment.gst_rate),
          gst_number: setRows[0]?.gst_number,
          business_name: setRows[0]?.business_name,
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/payments/payouts — admin lists all payouts
const getPayouts = async (req, res) => {
  try {
    const { status, entity_type } = req.query;

    // Auto-flag overdue payouts
    await pool.query(
      "UPDATE payouts SET status = 'due' WHERE status = 'pending' AND due_date <= CURRENT_DATE"
    );

    const conditions = [];
    const values = [];
    let idx = 1;
    if (status) { conditions.push(`p.status = $${idx++}`); values.push(status); }
    if (entity_type) { conditions.push(`p.entity_type = $${idx++}`); values.push(entity_type); }

    const { rows } = await pool.query(
      `SELECT p.*, pay.razorpay_payment_id
       FROM payouts p
       LEFT JOIN payments pay ON pay.id = p.payment_id
       ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
       ORDER BY
         CASE p.status WHEN 'due' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
         p.due_date ASC`,
      values
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/payments/payouts/:id/pay — admin marks payout as paid
const markPayoutPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const { rows } = await pool.query(
      "UPDATE payouts SET status = 'paid', paid_at = NOW(), notes = $1 WHERE id = $2 RETURNING *",
      [notes || null, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Payout not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/payments/entity-schedule — admin sets payout days for a specific hotel/restaurant
const updateEntitySchedule = async (req, res) => {
  const { entity_type, entity_id, payout_schedule_days } = req.body;
  try {
    const table = entity_type === 'hotel' ? 'hotels' : 'restaurants';
    await pool.query(`UPDATE ${table} SET payout_schedule_days = $1 WHERE id = $2`, [payout_schedule_days, entity_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSettings, updateSettings, createOrder, verifyPayment,
  getPayouts, markPayoutPaid, updateEntitySchedule,
};
