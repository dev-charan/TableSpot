const { pool } = require('../config/db');

exports.getRoomTypes = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM room_types WHERE hotel_id = $1 ORDER BY price_per_night',
      [hotel_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createRoomType = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const { name, description, price_per_night, max_occupancy, total_rooms, amenities } = req.body;

    const own = await pool.query('SELECT owner_id FROM hotels WHERE id = $1', [hotel_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const images = req.files ? req.files.map((f) => `/uploads/hotels/${f.filename}`) : [];
    const amenitiesArr = amenities
      ? (typeof amenities === 'string' ? JSON.parse(amenities) : amenities)
      : [];

    const { rows } = await pool.query(
      `INSERT INTO room_types (hotel_id, name, description, price_per_night, max_occupancy, total_rooms, amenities, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hotel_id, name, description, price_per_night, max_occupancy || 2, total_rooms || 1, amenitiesArr, images]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateRoomType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await pool.query(
      'SELECT rt.*, h.owner_id FROM room_types rt JOIN hotels h ON h.id = rt.hotel_id WHERE rt.id = $1',
      [id]
    );
    if (!room.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (room.rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const { name, description, price_per_night, max_occupancy, total_rooms, is_available, amenities } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    const fields = { name, description, price_per_night, max_occupancy, total_rooms, is_available };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { updates.push(`${k} = $${idx++}`); values.push(v); }
    }
    if (amenities !== undefined) {
      updates.push(`amenities = $${idx++}`);
      values.push(typeof amenities === 'string' ? JSON.parse(amenities) : amenities);
    }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE room_types SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteRoomType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await pool.query(
      'SELECT rt.*, h.owner_id FROM room_types rt JOIN hotels h ON h.id = rt.hotel_id WHERE rt.id = $1',
      [id]
    );
    if (!room.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (room.rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM room_types WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.checkAvailability = async (req, res, next) => {
  try {
    const { hotel_id } = req.params;
    const { check_in, check_out, guests = 1, rooms = 1 } = req.query;

    if (!check_in || !check_out) return res.status(400).json({ message: 'check_in and check_out required' });

    const roomTypes = await pool.query(
      'SELECT * FROM room_types WHERE hotel_id = $1 AND is_available = true AND max_occupancy >= $2 ORDER BY price_per_night',
      [hotel_id, guests]
    );

    const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));

    const result = [];
    for (const rt of roomTypes.rows) {
      const booked = await pool.query(
        `SELECT COALESCE(SUM(rooms), 0) as booked_rooms FROM hotel_bookings
         WHERE room_type_id = $1
         AND status IN ('confirmed','pending')
         AND check_in < $2 AND check_out > $3`,
        [rt.id, check_out, check_in]
      );

      const bookedRooms = parseInt(booked.rows[0].booked_rooms);
      const availableRooms = rt.total_rooms - bookedRooms;

      result.push({
        ...rt,
        available_rooms: availableRooms,
        is_available_now: availableRooms >= parseInt(rooms),
        total_price: rt.price_per_night * nights * parseInt(rooms),
        nights,
      });
    }

    res.json(result);
  } catch (err) { next(err); }
};
