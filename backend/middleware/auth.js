const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (!rows[0]) return res.status(401).json({ message: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { auth, requireRole };
