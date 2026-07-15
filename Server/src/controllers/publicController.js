const fs = require('fs');
const path = require('path');
const { queryOne, queryRows } = require('../utils/db');
const { sendEmail } = require('../services/emailService');

function getSiteDataMap(row) {
  if (!row) return {};
  return {
    company: row.company,
    tagline: row.tagline,
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    address: row.address,
    hours: row.hours,
    facebook: row.facebook,
    instagram: row.instagram,
    tiktok: row.tiktok,
    linkedin: row.linkedin,
    youtube: row.youtube,
    twitter: row.twitter,
    ga: row.ga
  };
}

function getStatsMap(row) {
  if (!row) return { boreholes: 0, solar: 0, clients: 0, counties: 0 };
  return {
    boreholes: row.boreholes,
    solar: row.solar,
    clients: row.clients,
    counties: row.counties
  };
}

async function health(req, res) {
  res.json({ status: 'ok', uptime: process.uptime() });
}

async function submitContact(req, res) {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    const result = await queryOne(
      'INSERT INTO contacts (name, email, phone, service, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [name, email, phone || null, service || null, message]
    );

    await sendEmail('contact', { name, email, phone, service, message });
    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Contact submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save contact request.' });
  }
}

async function submitQuote(req, res) {
  const { name, email, phone, location, service, package: pkg, description, contact_method } = req.body;

  if (!name || !email || !location || !description) {
    return res.status(400).json({ error: 'Name, email, location, and description are required.' });
  }

  try {
    const result = await queryOne(
      'INSERT INTO quotes (name, email, phone, location, service, package, description, contact_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at',
      [name, email, phone || null, location, service || null, pkg || null, description, contact_method || null]
    );

    await sendEmail('quote', {
      name,
      email,
      phone,
      location,
      service,
      package: pkg,
      description,
      contact_method
    });

    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Quote submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save quote request.' });
  }
}

async function getSiteData(req, res) {
  try {
    const [settingsRow, statsRow, services, packages, testimonials, team, faq, projects, blog] = await Promise.all([
      queryOne('SELECT * FROM site_settings ORDER BY updated_at DESC LIMIT 1'),
      queryOne('SELECT * FROM site_stats ORDER BY updated_at DESC LIMIT 1'),
      queryRows('SELECT * FROM services ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM packages ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM testimonials ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM team_members ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM faq_items ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM projects ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM blog_posts ORDER BY date DESC, id DESC')
    ]);

    res.json({
      settings: getSiteDataMap(settingsRow),
      stats: getStatsMap(statsRow),
      services: services.map(s => ({ ...s, order: s.display_order })),
      packages: packages.map(p => ({ ...p, order: p.display_order, priceLabel: p.price_label })),
      testimonials: testimonials.map(t => ({ ...t, order: t.display_order })),
      team: team.map(t => ({ ...t, order: t.display_order })),
      faq: faq.map(f => ({ ...f, order: f.display_order })),
      projects: projects.map(p => ({ ...p, order: p.display_order })),
      blog: blog.map(b => ({ ...b })),
      published_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch site data:', error.message || error);
    res.status(500).json({ error: 'Failed to load site content.' });
  }
}

async function publishSiteData(req, res) {
  try {
    const [settingsRow, statsRow, services, packages, testimonials, team, faq, projects, blog] = await Promise.all([
      queryOne('SELECT * FROM site_settings ORDER BY updated_at DESC LIMIT 1'),
      queryOne('SELECT * FROM site_stats ORDER BY updated_at DESC LIMIT 1'),
      queryRows('SELECT * FROM services ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM packages ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM testimonials ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM team_members ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM faq_items ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM projects ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM blog_posts ORDER BY date DESC, id DESC')
    ]);

    const siteData = {
      settings: getSiteDataMap(settingsRow),
      stats: getStatsMap(statsRow),
      services: services.map(s => ({ ...s, order: s.display_order })),
      packages: packages.map(p => ({ ...p, order: p.display_order, priceLabel: p.price_label })),
      testimonials: testimonials.map(t => ({ ...t, order: t.display_order })),
      team: team.map(t => ({ ...t, order: t.display_order })),
      faq: faq.map(f => ({ ...f, order: f.display_order })),
      projects: projects.map(p => ({ ...p, order: p.display_order })),
      blog: blog.map(b => ({ ...b })),
      published_at: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '..', '..', '..', 'client', 'site-data.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(siteData, null, 2), 'utf8');

    res.json({ success: true, message: 'Site data published to client/site-data.json' });
  } catch (error) {
    console.error('Publish site data failed:', error.message || error);
    res.status(500).json({ error: 'Failed to publish site data.' });
  }
}

async function uploadImage(req, res) {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, error: 'No image uploaded.' });
    }

    let image = req.files.image;
    if (Array.isArray(image)) image = image[0];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(image.mimetype)) {
      return res.status(400).json({ success: false, error: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF, SVG' });
    }

    if (image.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large. Maximum 5MB' });
    }

    const section = String(req.body.section || 'general').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'general';
    const itemId = String(req.body.item_id || 'item').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'item';
    const uploadDir = path.join(__dirname, '..', '..', '..', 'client', 'uploads', section);
    await fs.promises.mkdir(uploadDir, { recursive: true });

    let ext = path.extname(image.name).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!ext) ext = '.jpg';
    const filename = `${section}-${itemId}-${Date.now()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filepath, image.data);

    const fileUrl = `uploads/${section}/${filename}`;
    await queryOne(
      'INSERT INTO file_uploads (filename, section, item_id, url, mime_type, size) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [filename, section, itemId, fileUrl, image.mimetype, image.size]
    );

    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Image upload failed:', error.message || error);
    res.status(500).json({ success: false, error: 'Image upload failed.' });
  }
}

module.exports = {
  health,
  submitContact,
  submitQuote,
  getSiteData,
  publishSiteData,
  uploadImage
};
