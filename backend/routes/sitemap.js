const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const DOMAIN = 'https://www.smartaithi.com';

const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/hotels', priority: '0.9', changefreq: 'daily' },
  { url: '/login', priority: '0.5', changefreq: 'monthly' },
  { url: '/register', priority: '0.5', changefreq: 'monthly' },
  { url: '/become-host', priority: '0.6', changefreq: 'monthly' },
];

router.get('/sitemap.xml', async (req, res) => {
  try {
    const [restaurants, hotels] = await Promise.all([
      pool.query("SELECT id, updated_at FROM restaurants WHERE status = 'active'"),
      pool.query("SELECT id, updated_at FROM hotels WHERE status = 'active'"),
    ]);

    const urls = [
      ...staticPages.map(
        (p) => `<url><loc>${DOMAIN}${p.url}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
      ),
      ...restaurants.rows.map(
        (r) => `<url><loc>${DOMAIN}/restaurants/${r.id}</loc><lastmod>${new Date(r.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
      ...hotels.rows.map(
        (h) => `<url><loc>${DOMAIN}/hotels/${h.id}</loc><lastmod>${new Date(h.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /hotel-dashboard/
Disallow: /api/

Sitemap: ${DOMAIN}/sitemap.xml`);
});

module.exports = router;
