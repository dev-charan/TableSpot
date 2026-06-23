const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(400).json({ message: 'Email already registered' });

    const allowedRoles = ['user', 'restaurant_owner', 'hotel_owner'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role',
      [name, email, hash, phone, userRole]
    );

    res.status(201).json({ token: signToken(rows[0].id), user: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const { password_hash, ...userData } = user;
    res.json({ token: signToken(user.id), user: userData });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, phone, avatar, no_show_count, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, current_password, new_password } = req.body;
    const avatar = req.file ? `/uploads/restaurants/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone || null); }
    if (avatar) { fields.push(`avatar = $${idx++}`); values.push(avatar); }

    if (new_password) {
      if (!current_password) return res.status(400).json({ message: 'Current password required' });
      const { rows: ur } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(current_password, ur[0].password_hash);
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
      if (new_password.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
      fields.push(`password_hash = $${idx++}`);
      values.push(await bcrypt.hash(new_password, 12));
    }

    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, phone, avatar`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
