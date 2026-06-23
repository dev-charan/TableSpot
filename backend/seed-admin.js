require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@tablespot.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = 'Super Admin';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
    console.log(`Updated ${email} to admin role`);
  } else {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'admin')",
      [name, email, hash]
    );
    console.log(`Admin created: ${email} / ${password}`);
  }
  process.exit(0);
}

seedAdmin().catch((e) => { console.error(e); process.exit(1); });
