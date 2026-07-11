const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/db');
const email = require('../utils/email');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1,$2,$3,$4,'user') RETURNING id, name, email, role",
      [name, email, hash, phone]
    );

    email.welcomeGuest(rows[0].email, rows[0].name);
    email.adminNewUser(rows[0].name, rows[0].email, 'user');
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
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const { password_hash, ...userData } = user;
    res.json({ token: signToken(user.id), user: userData });
  } catch (err) {
    next(err);
  }
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { credential, role: requestedRole } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Find existing user by google_id or email
    let { rows } = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    if (rows[0]) {
      // Trying to become a host but already registered with a different role
      if (requestedRole && rows[0].role !== requestedRole) {
        return res.status(400).json({ message: 'This Google account is already registered. Please sign in instead.' });
      }
      // Link google_id if not already set
      if (!rows[0].google_id) {
        const updated = await pool.query(
          'UPDATE users SET google_id = $1, avatar = COALESCE(avatar, $2) WHERE id = $3 RETURNING *',
          [googleId, picture, rows[0].id]
        );
        rows = updated.rows;
      }
    } else {
      // New user — determine role
      let role;
      if (requestedRole && ['hotel_owner', 'restaurant_owner'].includes(requestedRole)) {
        role = requestedRole;
      } else {
        const adminEmails = (process.env.ADMIN_GOOGLE_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
        role = adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
      }
      const created = await pool.query(
        'INSERT INTO users (name, email, google_id, avatar, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, googleId, picture, role]
      );
      rows = created.rows;
      // Send welcome email to new Google users
      if (role === 'restaurant_owner' || role === 'hotel_owner') {
        email.welcomeHost(rows[0].email, rows[0].name, role);
      } else if (role === 'user') {
        email.welcomeGuest(rows[0].email, rows[0].name);
      }
      email.adminNewUser(rows[0].name, rows[0].email, role);
    }

    const { password_hash, ...userData } = rows[0];
    res.json({ token: signToken(rows[0].id), user: userData });
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
      if (!ur[0].password_hash) return res.status(400).json({ message: 'No password set on this account' });
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
