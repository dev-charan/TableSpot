const { pool } = require('../config/db');

exports.getMenu = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { rows } = await pool.query(
      `SELECT mc.id, mc.name, mc.sort_order,
        COALESCE(json_agg(
          json_build_object(
            'id', mi.id, 'name', mi.name, 'description', mi.description,
            'price', mi.price, 'image', mi.image, 'is_available', mi.is_available, 'is_must_try', mi.is_must_try
          ) ORDER BY mi.name
        ) FILTER (WHERE mi.id IS NOT NULL), '[]') as items
       FROM menu_categories mc
       LEFT JOIN menu_items mi ON mi.category_id = mc.id
       WHERE mc.restaurant_id = $1
       GROUP BY mc.id ORDER BY mc.sort_order`,
      [restaurant_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { name, sort_order } = req.body;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { rows } = await pool.query(
      'INSERT INTO menu_categories (restaurant_id, name, sort_order) VALUES ($1,$2,$3) RETURNING *',
      [restaurant_id, name, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { category_id, name, description, price, is_must_try } = req.body;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const image = req.file ? `/uploads/menus/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO menu_items (category_id, restaurant_id, name, description, price, image, is_must_try)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [category_id, restaurant_id, name, description, price, image, is_must_try === 'true']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.bulkCreateItems = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const { category_id, items } = req.body;

    const own = await pool.query('SELECT owner_id FROM restaurants WHERE id = $1', [restaurant_id]);
    if (!own.rows[0] || own.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const item of items) {
        const { rows } = await client.query(
          'INSERT INTO menu_items (category_id, restaurant_id, name, description, price) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [category_id, restaurant_id, item.name, item.description, item.price]
        );
        inserted.push(rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json(inserted);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, is_available, is_must_try } = req.body;
    const image = req.file ? `/uploads/menus/${req.file.filename}` : undefined;

    const updates = [];
    const values = [];
    let idx = 1;

    const fields = { name, description, price, is_available, is_must_try };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { updates.push(`${k} = $${idx++}`); values.push(v); }
    }
    if (image) { updates.push(`image = $${idx++}`); values.push(image); }

    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
