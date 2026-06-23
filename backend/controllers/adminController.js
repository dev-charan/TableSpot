const { pool } = require('../config/db');

exports.getStats = async (req, res, next) => {
  try {
    const [users, restaurants, hotels, restBookings, hotelBookings, recentActivity] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'user') as diners,
          COUNT(*) FILTER (WHERE role = 'restaurant_owner') as restaurant_owners,
          COUNT(*) FILTER (WHERE role = 'hotel_owner') as hotel_owners,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week
        FROM users
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week
        FROM restaurants
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week
        FROM hotels
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days') as this_week,
          COUNT(*) FILTER (WHERE booking_date >= DATE_TRUNC('month', CURRENT_DATE)) as this_month
        FROM bookings
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0) as total_revenue,
          COUNT(*) FILTER (WHERE check_in = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE check_in >= CURRENT_DATE - INTERVAL '7 days') as this_week,
          COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed') AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as revenue_this_month
        FROM hotel_bookings
      `),
      pool.query(`
        SELECT 'restaurant_booking' as type, b.id, u.name as user_name, r.name as entity_name, b.status, b.created_at
        FROM bookings b JOIN users u ON u.id = b.user_id JOIN restaurants r ON r.id = b.restaurant_id
        UNION ALL
        SELECT 'hotel_booking' as type, hb.id, u.name as user_name, h.name as entity_name, hb.status, hb.created_at
        FROM hotel_bookings hb JOIN users u ON u.id = hb.user_id JOIN hotels h ON h.id = hb.hotel_id
        ORDER BY created_at DESC LIMIT 10
      `),
    ]);

    const last7days = await pool.query(`
      SELECT
        d::date as date,
        (SELECT COUNT(*) FROM bookings WHERE booking_date = d::date) as restaurant_bookings,
        (SELECT COUNT(*) FROM hotel_bookings WHERE check_in = d::date) as hotel_bookings
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
      ORDER BY d
    `);

    res.json({
      users: users.rows[0],
      restaurants: restaurants.rows[0],
      hotels: hotels.rows[0],
      restaurant_bookings: restBookings.rows[0],
      hotel_bookings: hotelBookings.rows[0],
      recent_activity: recentActivity.rows,
      last7days: last7days.rows,
    });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(LOWER(name) LIKE LOWER($${idx}) OR LOWER(email) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }
    if (role) { conditions.push(`role = $${idx++}`); values.push(role); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM users ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id, name, email, role, phone, no_show_count, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ users: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, no_show_count } = req.body;

    if (id === req.user.id) return res.status(400).json({ message: 'Cannot modify your own account' });

    const updates = [];
    const values = [];
    let idx = 1;

    const allowed_roles = ['user', 'restaurant_owner', 'hotel_owner', 'admin'];
    if (role && allowed_roles.includes(role)) { updates.push(`role = $${idx++}`); values.push(role); }
    if (no_show_count !== undefined) { updates.push(`no_show_count = $${idx++}`); values.push(no_show_count); }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, no_show_count`,
      values
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

exports.getRestaurants = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(LOWER(r.name) LIKE LOWER($${idx}) OR LOWER(r.city) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`r.status = $${idx++}`); values.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM restaurants r ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT r.*, u.name as owner_name, u.email as owner_email
       FROM restaurants r JOIN users u ON u.id = r.owner_id
       ${where} ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ restaurants: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};

exports.updateRestaurantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['active', 'pending', 'suspended'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const { rows } = await pool.query(
      'UPDATE restaurants SET status = $1 WHERE id = $2 RETURNING id, name, status',
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteRestaurant = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM restaurants WHERE id = $1', [req.params.id]);
    res.json({ message: 'Restaurant deleted' });
  } catch (err) { next(err); }
};

exports.getHotels = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(LOWER(h.name) LIKE LOWER($${idx}) OR LOWER(h.city) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }
    if (status) { conditions.push(`h.status = $${idx++}`); values.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM hotels h ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT h.*, u.name as owner_name, u.email as owner_email
       FROM hotels h JOIN users u ON u.id = h.owner_id
       ${where} ORDER BY h.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ hotels: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};

exports.updateHotelStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['active', 'pending', 'suspended'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const { rows } = await pool.query(
      'UPDATE hotels SET status = $1 WHERE id = $2 RETURNING id, name, status',
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteHotel = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM hotels WHERE id = $1', [req.params.id]);
    res.json({ message: 'Hotel deleted' });
  } catch (err) { next(err); }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    const values = [];
    let idx = 1;

    if (status) { conditions.push(`b.status = $${idx++}`); values.push(status); }
    if (search) {
      conditions.push(`(LOWER(u.name) LIKE LOWER($${idx}) OR LOWER(r.name) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM bookings b JOIN users u ON u.id = b.user_id JOIN restaurants r ON r.id = b.restaurant_id ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT b.*, u.name as user_name, u.email as user_email, r.name as restaurant_name, r.city
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN restaurants r ON r.id = b.restaurant_id
       ${where} ORDER BY b.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ bookings: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};

exports.getReviews = async (req, res, next) => {
  try {
    const { type = 'restaurant', search, visibility, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (type === 'restaurant') {
      let conditions = [];
      const values = [];
      let idx = 1;

      if (search) {
        conditions.push(`(LOWER(u.name) LIKE LOWER($${idx}) OR LOWER(r.name) LIKE LOWER($${idx}))`);
        values.push(`%${search}%`); idx++;
      }
      if (visibility === 'visible') { conditions.push(`rv.is_visible = true`); }
      if (visibility === 'hidden') { conditions.push(`rv.is_visible = false`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM reviews rv JOIN users u ON u.id = rv.user_id JOIN restaurants r ON r.id = rv.restaurant_id ${where}`,
        values
      );

      values.push(limit, offset);
      const { rows } = await pool.query(
        `SELECT rv.*, u.name as user_name, r.name as entity_name, r.id as entity_id
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         JOIN restaurants r ON r.id = rv.restaurant_id
         ${where} ORDER BY rv.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        values
      );

      return res.json({ reviews: rows, total: parseInt(countRes.rows[0].count), pages: Math.ceil(countRes.rows[0].count / limit) });
    }

    // hotel
    let conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(LOWER(u.name) LIKE LOWER($${idx}) OR LOWER(h.name) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }
    if (visibility === 'visible') { conditions.push(`hr.is_visible = true`); }
    if (visibility === 'hidden') { conditions.push(`hr.is_visible = false`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM hotel_reviews hr JOIN users u ON u.id = hr.user_id JOIN hotels h ON h.id = hr.hotel_id ${where}`,
      values
    );

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT hr.*, u.name as user_name, h.name as entity_name, h.id as entity_id,
        rt.name as room_type_name
       FROM hotel_reviews hr
       JOIN users u ON u.id = hr.user_id
       JOIN hotels h ON h.id = hr.hotel_id
       LEFT JOIN hotel_bookings hb ON hb.id = hr.booking_id
       LEFT JOIN room_types rt ON rt.id = hb.room_type_id
       ${where} ORDER BY hr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ reviews: rows, total: parseInt(countRes.rows[0].count), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};

exports.toggleReviewVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'restaurant' } = req.query;

    if (type === 'restaurant') {
      const { rows } = await pool.query(
        'UPDATE reviews SET is_visible = NOT is_visible WHERE id = $1 RETURNING id, restaurant_id, is_visible',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Review not found' });
      await pool.query(
        `UPDATE restaurants SET
          avg_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE restaurant_id = $1 AND is_visible = true), 0),
          total_reviews = (SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1 AND is_visible = true)
         WHERE id = $1`,
        [rows[0].restaurant_id]
      );
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      'UPDATE hotel_reviews SET is_visible = NOT is_visible WHERE id = $1 RETURNING id, hotel_id, is_visible',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Review not found' });
    await pool.query(
      `UPDATE hotels SET
        avg_rating = COALESCE((SELECT AVG(rating) FROM hotel_reviews WHERE hotel_id = $1 AND is_visible = true), 0),
        total_reviews = (SELECT COUNT(*) FROM hotel_reviews WHERE hotel_id = $1 AND is_visible = true)
       WHERE id = $1`,
      [rows[0].hotel_id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'restaurant' } = req.query;

    if (type === 'restaurant') {
      const { rows } = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING restaurant_id', [id]);
      if (rows[0]) {
        await pool.query(
          `UPDATE restaurants SET
            avg_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE restaurant_id = $1 AND is_visible = true), 0),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1 AND is_visible = true)
           WHERE id = $1`,
          [rows[0].restaurant_id]
        );
      }
      return res.json({ message: 'Review deleted' });
    }

    const { rows } = await pool.query('DELETE FROM hotel_reviews WHERE id = $1 RETURNING hotel_id', [id]);
    if (rows[0]) {
      await pool.query(
        `UPDATE hotels SET
          avg_rating = COALESCE((SELECT AVG(rating) FROM hotel_reviews WHERE hotel_id = $1 AND is_visible = true), 0),
          total_reviews = (SELECT COUNT(*) FROM hotel_reviews WHERE hotel_id = $1 AND is_visible = true)
         WHERE id = $1`,
        [rows[0].hotel_id]
      );
    }
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
};

exports.getAllHotelBookings = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    const values = [];
    let idx = 1;

    if (status) { conditions.push(`hb.status = $${idx++}`); values.push(status); }
    if (search) {
      conditions.push(`(LOWER(u.name) LIKE LOWER($${idx}) OR LOWER(h.name) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`); idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(`SELECT COUNT(*) FROM hotel_bookings hb JOIN users u ON u.id = hb.user_id JOIN hotels h ON h.id = hb.hotel_id ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT hb.*, u.name as user_name, u.email as user_email, h.name as hotel_name, h.city, rt.name as room_type_name
       FROM hotel_bookings hb
       JOIN users u ON u.id = hb.user_id
       JOIN hotels h ON h.id = hb.hotel_id
       LEFT JOIN room_types rt ON rt.id = hb.room_type_id
       ${where} ORDER BY hb.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({ bookings: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), pages: Math.ceil(countRes.rows[0].count / limit) });
  } catch (err) { next(err); }
};
