const { pool } = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.createHotelReview = async (req, res, next) => {
  try {
    const { hotel_id, booking_id, rating, comment } = req.body;

    const booking = await pool.query(
      "SELECT * FROM hotel_bookings WHERE id = $1 AND user_id = $2 AND status = 'completed'",
      [booking_id, req.user.id]
    );
    if (!booking.rows[0]) {
      return res.status(400).json({ message: 'You can only review after a completed stay' });
    }

    const existing = await pool.query('SELECT id FROM hotel_reviews WHERE booking_id = $1', [booking_id]);
    if (existing.rows[0]) return res.status(400).json({ message: 'Review already submitted' });

    const { rows } = await pool.query(
      'INSERT INTO hotel_reviews (user_id, hotel_id, booking_id, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, hotel_id, booking_id, rating, comment]
    );

    await pool.query(
      `UPDATE hotels SET
        avg_rating = (SELECT AVG(rating) FROM hotel_reviews WHERE hotel_id = $1),
        total_reviews = (SELECT COUNT(*) FROM hotel_reviews WHERE hotel_id = $1)
       WHERE id = $1`,
      [hotel_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getHotelReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT hr.*, u.name as user_name, u.avatar as user_avatar,
        rt.name as room_type_name
       FROM hotel_reviews hr
       JOIN users u ON u.id = hr.user_id
       LEFT JOIN hotel_bookings hb ON hb.id = hr.booking_id
       LEFT JOIN room_types rt ON rt.id = hb.room_type_id
       WHERE hr.hotel_id = $1 AND hr.is_visible = true
       ORDER BY hr.created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.generateHotelAISummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    const own = await pool.query('SELECT owner_id FROM hotels WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { rows } = await pool.query(
      'SELECT rating, comment FROM hotel_reviews WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );

    if (!rows.length) return res.status(400).json({ message: 'No reviews to summarize' });
    if (!process.env.GEMINI_API_KEY) return res.status(400).json({ message: 'Gemini API key not configured' });

    const reviewText = rows
      .filter((r) => r.comment)
      .map((r) => `Rating: ${r.rating}/5 - "${r.comment}"`)
      .join('\n');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on these hotel reviews, write a 2-3 sentence highlight that mentions specific features guests loved (rooms, service, amenities, location). Be concise and enthusiastic:\n\n${reviewText}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    await pool.query('UPDATE hotels SET ai_summary = $1 WHERE id = $2', [summary, id]);

    res.json({ summary });
  } catch (err) {
    next(err);
  }
};
