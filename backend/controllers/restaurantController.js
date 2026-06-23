const axios = require('axios');
const { pool } = require('../config/db');

exports.autofill = async (req, res, next) => {
  try {
    const { name, city } = req.query;
    if (!name || !city) return res.status(400).json({ message: 'name and city required' });

    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${name}, ${city}`, format: 'json', limit: 1, addressdetails: 1 },
      headers: { 'User-Agent': 'RestaurantBookingApp/1.0' },
    });

    if (!geoRes.data.length) return res.json({ found: false });

    const place = geoRes.data[0];
    const addr = place.address || {};

    const overpassQuery = `
      [out:json][timeout:10];
      node(around:200,${place.lat},${place.lon})[amenity=restaurant][name~"${name}",i];
      out body;
    `;

    let osmData = {};
    try {
      const ovRes = await axios.post(
        'https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(overpassQuery)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
      );
      if (ovRes.data.elements?.length) {
        const el = ovRes.data.elements[0];
        osmData = {
          osm_id: String(el.id),
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          cuisine_type: el.tags?.cuisine || '',
          opening_hours: el.tags?.opening_hours || '',
        };
      }
    } catch (_) {}

    res.json({
      found: true,
      name,
      address: place.display_name.split(',').slice(0, 3).join(',').trim(),
      city: addr.city || addr.town || addr.village || city,
      state: addr.state || '',
      country: addr.country || 'India',
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      ...osmData,
    });
  } catch (err) {
    next(err);
  }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const {
      name, description, cuisine_type, address, city, state, country,
      lat, lng, phone, website, opening_hours, price_range, osm_id,
    } = req.body;

    const cover_image = req.files?.cover_image?.[0]
      ? `/uploads/restaurants/${req.files.cover_image[0].filename}`
      : null;

    const images = req.files?.images
      ? req.files.images.map((f) => `/uploads/restaurants/${f.filename}`)
      : [];

    const { rows } = await pool.query(
      `INSERT INTO restaurants
        (owner_id, name, description, cuisine_type, address, city, state, country,
         lat, lng, phone, website, opening_hours, price_range, cover_image, images, osm_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        req.user.id, name, description, cuisine_type, address, city, state,
        country || 'India', lat, lng, phone, website,
        opening_hours ? JSON.parse(opening_hours) : { open: '11:00', close: '23:00' },
        price_range || 2, cover_image, images, osm_id,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getRestaurants = async (req, res, next) => {
  try {
    const { city, cuisine, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = ["r.status = 'active'"];
    const values = [];
    let idx = 1;

    if (city) { conditions.push(`LOWER(r.city) = LOWER($${idx++})`); values.push(city); }
    if (cuisine) { conditions.push(`LOWER(r.cuisine_type) LIKE LOWER($${idx++})`); values.push(`%${cuisine}%`); }
    if (search) {
      conditions.push(`(LOWER(r.name) LIKE LOWER($${idx}) OR LOWER(r.description) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM restaurants r ${where}`,
      values
    );

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT r.*, u.name as owner_name,
        (SELECT COUNT(*) FROM bookings b WHERE b.restaurant_id = r.id AND b.booking_date = CURRENT_DATE AND b.status = 'confirmed') as today_bookings
       FROM restaurants r
       JOIN users u ON u.id = r.owner_id
       ${where}
       ORDER BY r.avg_rating DESC, r.total_bookings DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({
      restaurants: rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countRes.rows[0].count / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.getRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT r.*, u.name as owner_name, u.email as owner_email
       FROM restaurants r
       JOIN users u ON u.id = r.owner_id
       WHERE r.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Restaurant not found' });

    const tables = await pool.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 AND is_active = true ORDER BY capacity',
      [id]
    );

    const menu = await pool.query(
      `SELECT mc.id as category_id, mc.name as category_name, mc.sort_order,
        json_agg(json_build_object(
          'id', mi.id, 'name', mi.name, 'description', mi.description,
          'price', mi.price, 'image', mi.image, 'is_available', mi.is_available, 'is_must_try', mi.is_must_try
        ) ORDER BY mi.name) as items
       FROM menu_categories mc
       LEFT JOIN menu_items mi ON mi.category_id = mc.id
       WHERE mc.restaurant_id = $1
       GROUP BY mc.id ORDER BY mc.sort_order`,
      [id]
    );

    res.json({ ...rows[0], tables: tables.rows, menu: menu.rows });
  } catch (err) {
    next(err);
  }
};

exports.getMyRestaurants = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.updateRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [id]);
    if (!own.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (own.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const textFields = [
      'name', 'description', 'cuisine_type', 'address', 'city', 'state', 'country',
      'phone', 'website', 'price_range', 'lat', 'lng', 'opening_hours',
    ];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const f of textFields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`);
        values.push(f === 'opening_hours' ? JSON.parse(req.body[f]) : req.body[f]);
      }
    }

    if (req.files?.cover_image?.[0]) {
      updates.push(`cover_image = $${idx++}`);
      values.push(`/uploads/restaurants/${req.files.cover_image[0].filename}`);
    }

    if (req.files?.images?.length) {
      updates.push(`images = $${idx++}`);
      values.push(req.files.images.map((f) => `/uploads/restaurants/${f.filename}`));
    }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getCities = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT city FROM restaurants WHERE status = 'active' AND city IS NOT NULL ORDER BY city"
    );
    res.json(rows.map((r) => r.city));
  } catch (err) {
    next(err);
  }
};

exports.getTodayStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status = 'confirmed') as today_bookings,
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status = 'cancelled') as today_cancellations,
        COUNT(*) FILTER (WHERE status = 'confirmed') as total_upcoming,
        COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status = 'no_show') as no_shows
       FROM bookings WHERE restaurant_id = $1`,
      [id]
    );

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
};
