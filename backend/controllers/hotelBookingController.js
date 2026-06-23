const { pool } = require('../config/db');

exports.createHotelBooking = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { hotel_id, room_type_id, check_in, check_out, guests, rooms, special_requests } = req.body;

    const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Check-out must be after check-in' });
    }

    const blackout = await client.query(
      `SELECT id FROM hotel_blackout_dates
       WHERE hotel_id = $1 AND blackout_date >= $2 AND blackout_date < $3`,
      [hotel_id, check_in, check_out]
    );
    if (blackout.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Hotel is closed on one or more of the selected dates' });
    }

    const roomType = await client.query(
      'SELECT * FROM room_types WHERE id = $1 AND hotel_id = $2 AND is_available = true',
      [room_type_id, hotel_id]
    );
    if (!roomType.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Room type not available' });
    }

    const booked = await client.query(
      `SELECT COALESCE(SUM(rooms), 0) as booked_rooms FROM hotel_bookings
       WHERE room_type_id = $1 AND status IN ('confirmed','pending')
       AND check_in < $2 AND check_out > $3`,
      [room_type_id, check_out, check_in]
    );

    const available = roomType.rows[0].total_rooms - parseInt(booked.rows[0].booked_rooms);
    if (available < parseInt(rooms)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `Only ${available} room(s) available for these dates` });
    }

    const total_price = roomType.rows[0].price_per_night * nights * parseInt(rooms);

    const { rows } = await client.query(
      `INSERT INTO hotel_bookings
        (user_id, hotel_id, room_type_id, check_in, check_out, guests, rooms, total_price, special_requests)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, hotel_id, room_type_id, check_in, check_out, guests, rooms, total_price, special_requests]
    );

    await client.query(
      'UPDATE hotels SET total_bookings = total_bookings + 1 WHERE id = $1',
      [hotel_id]
    );

    await client.query('COMMIT');

    req.io?.to(`hotel_${hotel_id}`).emit('hotel_booking_update', {
      type: 'new_booking',
      room_type_id,
      check_in,
      check_out,
    });

    res.status(201).json({ ...rows[0], nights, room_name: roomType.rows[0].name });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.getUserHotelBookings = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT hb.*, h.name as hotel_name, h.cover_image, h.address, h.city,
        h.check_in_time, h.check_out_time, h.star_rating,
        rt.name as room_type_name, rt.price_per_night,
        hr.rating as review_rating
       FROM hotel_bookings hb
       JOIN hotels h ON h.id = hb.hotel_id
       LEFT JOIN room_types rt ON rt.id = hb.room_type_id
       LEFT JOIN hotel_reviews hr ON hr.booking_id = hb.id
       WHERE hb.user_id = $1
       ORDER BY hb.check_in DESC, hb.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getHotelBookings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, from, to } = req.query;

    const own = await pool.query('SELECT owner_id FROM hotels WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let conditions = ['hb.hotel_id = $1'];
    const values = [id];
    let idx = 2;

    if (status) { conditions.push(`hb.status = $${idx++}`); values.push(status); }
    if (from) { conditions.push(`hb.check_in >= $${idx++}`); values.push(from); }
    if (to) { conditions.push(`hb.check_in <= $${idx++}`); values.push(to); }

    const { rows } = await pool.query(
      `SELECT hb.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        rt.name as room_type_name, rt.price_per_night
       FROM hotel_bookings hb
       JOIN users u ON u.id = hb.user_id
       LEFT JOIN room_types rt ON rt.id = hb.room_type_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY hb.check_in DESC`,
      values
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.cancelHotelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await pool.query('SELECT * FROM hotel_bookings WHERE id = $1', [id]);
    if (!booking.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (booking.rows[0].user_id !== req.user.id && req.user.role === 'user') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.rows[0].status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    await pool.query("UPDATE hotel_bookings SET status = 'cancelled' WHERE id = $1", [id]);
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
};

exports.updateHotelBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['confirmed', 'completed', 'no_show', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const booking = await pool.query(
      'SELECT hb.*, h.owner_id FROM hotel_bookings hb JOIN hotels h ON h.id = hb.hotel_id WHERE hb.id = $1',
      [id]
    );
    if (!booking.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (booking.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query('UPDATE hotel_bookings SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    next(err);
  }
};
