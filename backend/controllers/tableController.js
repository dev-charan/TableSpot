const { pool } = require('../config/db');

exports.getTables = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY table_number',
      [restaurant_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createTable = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { table_number, capacity, location } = req.body;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { rows } = await pool.query(
      'INSERT INTO tables (restaurant_id, table_number, capacity, location) VALUES ($1,$2,$3,$4) RETURNING *',
      [restaurant_id, table_number, capacity, location || 'indoor']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { table_number, capacity, location, is_active } = req.body;

    const tbl = await pool.query(
      'SELECT t.*, r.owner_id FROM tables t JOIN restaurants r ON r.id = t.restaurant_id WHERE t.id = $1',
      [id]
    );
    if (!tbl.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (tbl.rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const { rows } = await pool.query(
      `UPDATE tables SET
        table_number = COALESCE($1, table_number),
        capacity = COALESCE($2, capacity),
        location = COALESCE($3, location),
        is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [table_number, capacity, location, is_active, id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tbl = await pool.query(
      'SELECT t.*, r.owner_id FROM tables t JOIN restaurants r ON r.id = t.restaurant_id WHERE t.id = $1',
      [id]
    );
    if (!tbl.rows[0]) return res.status(404).json({ message: 'Not found' });
    if (tbl.rows[0].owner_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
    res.json({ message: 'Table deleted' });
  } catch (err) { next(err); }
};

exports.addBlackoutDate = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { blackout_date, reason } = req.body;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { rows } = await pool.query(
      'INSERT INTO blackout_dates (restaurant_id, blackout_date, reason) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',
      [restaurant_id, blackout_date, reason]
    );
    res.status(201).json(rows[0] || { message: 'Already exists' });
  } catch (err) { next(err); }
};

exports.getBlackoutDates = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM blackout_dates WHERE restaurant_id = $1 ORDER BY blackout_date',
      [restaurant_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.deleteBlackoutDate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM blackout_dates WHERE id = $1', [id]);
    res.json({ message: 'Removed' });
  } catch (err) { next(err); }
};
