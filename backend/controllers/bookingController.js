const { pool } = require('../config/db');

exports.createBooking = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { restaurant_id, table_id, booking_date, time_slot, party_size, special_requests } = req.body;

    const blackout = await client.query(
      'SELECT id FROM blackout_dates WHERE restaurant_id = $1 AND blackout_date = $2',
      [restaurant_id, booking_date]
    );
    if (blackout.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Restaurant is closed on this date' });
    }

    const conflict = await client.query(
      `SELECT id FROM bookings
       WHERE table_id = $1 AND booking_date = $2 AND time_slot = $3
       AND status IN ('confirmed','pending')`,
      [table_id, booking_date, time_slot]
    );
    if (conflict.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This table is already booked for the selected time' });
    }

    const tableCheck = await client.query(
      'SELECT capacity FROM tables WHERE id = $1 AND restaurant_id = $2 AND is_active = true',
      [table_id, restaurant_id]
    );
    if (!tableCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid table' });
    }
    if (tableCheck.rows[0].capacity < party_size) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Table capacity is ${tableCheck.rows[0].capacity}, party size too large` });
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (user_id, restaurant_id, table_id, booking_date, time_slot, party_size, special_requests)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, restaurant_id, table_id, booking_date, time_slot, party_size, special_requests]
    );

    await client.query(
      'UPDATE restaurants SET total_bookings = total_bookings + 1 WHERE id = $1',
      [restaurant_id]
    );

    await client.query('COMMIT');

    const booking = rows[0];

    req.io?.to(`restaurant_${restaurant_id}`).emit('booking_update', {
      type: 'new_booking',
      date: booking_date,
      time_slot,
      table_id,
    });

    res.status(201).json(booking);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { restaurant_id, date, party_size } = req.query;

    const tables = await pool.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 AND is_active = true AND capacity >= $2',
      [restaurant_id, party_size || 1]
    );

    const slots = [
      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM',
      '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
    ];

    const bookedSlots = await pool.query(
      `SELECT table_id, time_slot FROM bookings
       WHERE restaurant_id = $1 AND booking_date = $2 AND status IN ('confirmed','pending')`,
      [restaurant_id, date]
    );

    const bookedMap = {};
    for (const b of bookedSlots.rows) {
      if (!bookedMap[b.time_slot]) bookedMap[b.time_slot] = new Set();
      bookedMap[b.time_slot].add(b.table_id);
    }

    const availability = slots.map((slot) => {
      const bookedTables = bookedMap[slot] || new Set();
      const availableTables = tables.rows.filter((t) => !bookedTables.has(t.id));
      return { slot, available: availableTables.length > 0, tables: availableTables };
    });

    res.json(availability);
  } catch (err) {
    next(err);
  }
};

exports.getUserBookings = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, r.name as restaurant_name, r.cover_image, r.address,
        t.table_number, t.location as table_location,
        rv.rating as review_rating
       FROM bookings b
       JOIN restaurants r ON r.id = b.restaurant_id
       LEFT JOIN tables t ON t.id = b.table_id
       LEFT JOIN reviews rv ON rv.booking_id = b.id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getRestaurantBookings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, status } = req.query;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let conditions = ['b.restaurant_id = $1'];
    const values = [id];
    let idx = 2;

    if (date) { conditions.push(`b.booking_date = $${idx++}`); values.push(date); }
    if (status) { conditions.push(`b.status = $${idx++}`); values.push(status); }

    const { rows } = await pool.query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.no_show_count, t.table_number, t.location as table_location
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN tables t ON t.id = b.table_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.booking_date DESC, b.time_slot`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!booking.rows[0]) return res.status(404).json({ message: 'Booking not found' });

    const b = booking.rows[0];
    if (b.user_id !== req.user.id && req.user.role === 'user') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (b.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);

    req.io?.to(`restaurant_${b.restaurant_id}`).emit('booking_update', {
      type: 'cancelled',
      booking_id: id,
      date: b.booking_date,
      time_slot: b.time_slot,
    });

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['confirmed', 'completed', 'no_show', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const booking = await pool.query(
      `SELECT b.*, r.owner_id FROM bookings b JOIN restaurants r ON r.id = b.restaurant_id WHERE b.id = $1`,
      [id]
    );
    if (!booking.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (booking.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);

    if (status === 'no_show') {
      await pool.query('UPDATE users SET no_show_count = no_show_count + 1 WHERE id = $1', [booking.rows[0].user_id]);
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    next(err);
  }
};
