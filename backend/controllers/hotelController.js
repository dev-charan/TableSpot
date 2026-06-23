const axios = require('axios');
const { pool } = require('../config/db');

exports.autofill = async (req, res, next) => {
  try {
    const { name, city } = req.query;
    if (!name || !city) return res.status(400).json({ message: 'name and city required' });

    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${name} hotel, ${city}`, format: 'json', limit: 1, addressdetails: 1 },
      headers: { 'User-Agent': 'RestaurantBookingApp/1.0' },
    });

    if (!geoRes.data.length) return res.json({ found: false });

    const place = geoRes.data[0];
    const addr = place.address || {};

    const overpassQuery = `
      [out:json][timeout:10];
      (
        node(around:300,${place.lat},${place.lon})[tourism=hotel][name~"${name}",i];
        node(around:300,${place.lat},${place.lon})[tourism~"hotel|motel|hostel|guest_house"][name~"${name}",i];
      );
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
          star_rating: el.tags?.stars ? parseInt(el.tags.stars) : 3,
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

exports.createHotel = async (req, res, next) => {
  try {
    const {
      name, description, star_rating, hotel_type, address, city, state, country,
      lat, lng, phone, website, amenities, check_in_time, check_out_time, osm_id,
    } = req.body;

    const cover_image = req.files?.cover_image?.[0]
      ? `/uploads/hotels/${req.files.cover_image[0].filename}`
      : null;

    const images = req.files?.images
      ? req.files.images.map((f) => `/uploads/hotels/${f.filename}`)
      : [];

    const amenitiesArr = amenities
      ? (typeof amenities === 'string' ? JSON.parse(amenities) : amenities)
      : [];

    const { rows } = await pool.query(
      `INSERT INTO hotels
        (owner_id, name, description, star_rating, hotel_type, address, city, state, country,
         lat, lng, phone, website, amenities, check_in_time, check_out_time, cover_image, images, osm_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        req.user.id, name, description, star_rating || 3, hotel_type || 'hotel',
        address, city, state, country || 'India', lat, lng, phone, website,
        amenitiesArr, check_in_time || '14:00', check_out_time || '11:00',
        cover_image, images, osm_id,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getHotels = async (req, res, next) => {
  try {
    const { city, star_rating, search, hotel_type, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = ["h.status = 'active'"];
    const values = [];
    let idx = 1;

    if (city) { conditions.push(`LOWER(h.city) = LOWER($${idx++})`); values.push(city); }
    if (star_rating) { conditions.push(`h.star_rating = $${idx++}`); values.push(star_rating); }
    if (hotel_type) { conditions.push(`h.hotel_type = $${idx++}`); values.push(hotel_type); }
    if (search) {
      conditions.push(`(LOWER(h.name) LIKE LOWER($${idx}) OR LOWER(h.description) LIKE LOWER($${idx}))`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await pool.query(`SELECT COUNT(*) FROM hotels h ${where}`, values);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT h.*,
        (SELECT MIN(price_per_night) FROM room_types WHERE hotel_id = h.id AND is_available = true) as min_price,
        (SELECT MAX(price_per_night) FROM room_types WHERE hotel_id = h.id AND is_available = true) as max_price
       FROM hotels h
       ${where}
       ORDER BY h.avg_rating DESC, h.total_bookings DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    res.json({
      hotels: rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countRes.rows[0].count / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.getHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT h.*, u.name as owner_name FROM hotels h
       JOIN users u ON u.id = h.owner_id WHERE h.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Hotel not found' });

    const roomTypes = await pool.query(
      'SELECT * FROM room_types WHERE hotel_id = $1 AND is_available = true ORDER BY price_per_night',
      [id]
    );

    res.json({ ...rows[0], room_types: roomTypes.rows });
  } catch (err) {
    next(err);
  }
};

exports.getMyHotels = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM hotels WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.updateHotel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const own = await pool.query('SELECT owner_id FROM hotels WHERE id = $1', [id]);
    if (!own.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (own.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fields = ['name', 'description', 'star_rating', 'hotel_type', 'address', 'city', 'state', 'country', 'phone', 'website', 'check_in_time', 'check_out_time', 'lat', 'lng'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = $${idx++}`); values.push(req.body[f]); }
    }
    if (req.body.amenities) {
      updates.push(`amenities = $${idx++}`);
      values.push(typeof req.body.amenities === 'string' ? JSON.parse(req.body.amenities) : req.body.amenities);
    }
    if (req.files?.cover_image?.[0]) {
      updates.push(`cover_image = $${idx++}`);
      values.push(`/uploads/hotels/${req.files.cover_image[0].filename}`);
    }
    if (req.files?.images?.length) {
      updates.push(`images = $${idx++}`);
      values.push(req.files.images.map((f) => `/uploads/hotels/${f.filename}`));
    }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE hotels SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
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
      "SELECT DISTINCT city FROM hotels WHERE status = 'active' AND city IS NOT NULL ORDER BY city"
    );
    res.json(rows.map((r) => r.city));
  } catch (err) {
    next(err);
  }
};

exports.getHotelStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const own = await pool.query('SELECT owner_id FROM hotels WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'confirmed') as total_confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
        COUNT(*) FILTER (WHERE check_in >= CURRENT_DATE AND status IN ('confirmed','pending')) as upcoming,
        COUNT(*) FILTER (WHERE check_in = CURRENT_DATE AND status IN ('confirmed','pending')) as arriving_today,
        COUNT(*) FILTER (WHERE check_out = CURRENT_DATE AND status = 'confirmed') as departing_today,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0) as total_revenue,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed') AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as revenue_this_month
       FROM hotel_bookings WHERE hotel_id = $1`,
      [id]
    );

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
};
