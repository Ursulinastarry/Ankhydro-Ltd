const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';
const pool = new Pool({
  connectionString,
  ssl: connectionString && (process.env.NODE_ENV === 'production' || process.env.PGSSLMODE === 'require')
    ? { rejectUnauthorized: false }
    : false
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const blocked = [
    '/index.js',
    '/package.json',
    '/package-lock.json',
    '/package-lock.json',
    '/.env',
    '/server',
    '/node_modules'
  ];

  if (blocked.some(block => req.path === block || req.path.startsWith(block))) {
    return res.status(404).send('Not found');
  }

  next();
});

async function initDb() {
  if (!connectionString) {
    console.warn('DATABASE_URL is not configured. Database initialization skipped.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT,
      message TEXT,
      status TEXT DEFAULT 'Unread',
      notes TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      location TEXT,
      service TEXT,
      package TEXT,
      description TEXT,
      contact_method TEXT,
      status TEXT DEFAULT 'New',
      notes TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      company TEXT,
      tagline TEXT,
      phone TEXT,
      email TEXT,
      whatsapp TEXT,
      address TEXT,
      hours TEXT,
      facebook TEXT,
      instagram TEXT,
      tiktok TEXT,
      linkedin TEXT,
      youtube TEXT,
      twitter TEXT,
      ga TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_stats (
      id SERIAL PRIMARY KEY,
      boreholes INTEGER DEFAULT 0,
      solar INTEGER DEFAULT 0,
      clients INTEGER DEFAULT 0,
      counties INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT,
      description TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      price_label TEXT,
      category TEXT,
      specs TEXT,
      status TEXT DEFAULT 'inactive',
      featured BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT,
      service TEXT,
      description TEXT,
      date DATE,
      status TEXT DEFAULT 'draft',
      image TEXT,
      image2 TEXT,
      client TEXT,
      testimonial TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT,
      author TEXT,
      excerpt TEXT,
      content TEXT,
      date DATE,
      status TEXT DEFAULT 'draft',
      image TEXT,
      tags TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      client TEXT NOT NULL,
      location TEXT,
      service TEXT,
      rating INTEGER DEFAULT 5,
      text TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      bio TEXT,
      status TEXT DEFAULT 'inactive',
      display_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS faq_items (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT,
      category TEXT,
      status TEXT DEFAULT 'draft',
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      icon TEXT,
      user_email TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_uploads (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      section TEXT,
      item_id TEXT,
      url TEXT,
      mime_type TEXT,
      size INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEmailHtml(type, payload) {
  const rows = Object.entries(payload)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:700;text-transform:capitalize;">${escapeHtml(key.replace(/_/g, ' '))}</td>
        <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(String(value))}</td>
      </tr>`)
    .join('');

  return `
    <html>
      <body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
        <div style="max-width:650px;margin:0 auto;padding:20px;">
          <h2 style="color:#0a2540;">ANK Hydro ${escapeHtml(type === 'quote' ? 'Quote Request' : 'Contact Message')}</h2>
          <table style="border-collapse:collapse;width:100%;">${rows}</table>
        </div>
      </body>
    </html>`;
}

async function sendEmail(type, payload) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_TO) {
    return null;
  }

  const transportConfig = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  };

  const transporter = nodemailer.createTransport(transportConfig);
  const subject = type === 'quote' ? 'New Quote Request from ANK Hydro' : 'New Contact Message from ANK Hydro';

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@ankhydro.com',
    to: process.env.EMAIL_TO,
    subject,
    html: buildEmailHtml(type, payload)
  });
}

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    databaseConfigured: Boolean(connectionString)
  });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO contacts (name, email, phone, service, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [name, email, phone || null, service || null, message]
    );

    await sendEmail('contact', { name, email, phone, service, message });

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Contact submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save contact request.' });
  }
});

app.post('/api/quote', async (req, res) => {
  const { name, email, phone, location, service, package: pkg, description, contact_method } = req.body;

  if (!name || !email || !location || !description) {
    return res.status(400).json({ error: 'Name, email, location, and description are required.' });
  }

  try {
    const result = await pool.query(
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

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Quote submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save quote request.' });
  }
});

async function queryRows(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

function getAdminTable(type) {
  const map = {
    services: 'services',
    packages: 'packages',
    projects: 'projects',
    blog: 'blog_posts',
    testimonials: 'testimonials',
    team: 'team_members',
    faq: 'faq_items',
    quotes: 'quotes',
    messages: 'contacts',
    activity: 'activity_log'
  };
  return map[type] || null;
}

function formatBulkPayload(type, rows) {
  switch (type) {
    case 'services':
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        description: r.description,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null
      }));
    case 'packages':
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        price: r.price || 0,
        price_label: r.priceLabel || r.price_label || null,
        category: r.category,
        specs: r.specs,
        status: r.status,
        featured: r.featured || false,
        display_order: r.order || r.display_order || 0,
        image: r.image || null
      }));
    case 'projects':
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        location: r.location,
        service: r.service,
        description: r.description,
        date: r.date || null,
        status: r.status,
        image: r.image || null,
        image2: r.image2 || null,
        client: r.client || null,
        testimonial: r.testimonial || null,
        display_order: r.order || r.display_order || 0
      }));
    case 'blog':
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        author: r.author,
        excerpt: r.excerpt,
        content: r.content,
        date: r.date || null,
        status: r.status,
        image: r.image || null,
        tags: r.tags
      }));
    case 'testimonials':
      return rows.map(r => ({
        id: r.id,
        client: r.client,
        location: r.location,
        service: r.service,
        rating: r.rating || 5,
        text: r.text,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null
      }));
    case 'team':
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        role: r.role,
        bio: r.bio,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null
      }));
    case 'faq':
      return rows.map(r => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        category: r.category,
        status: r.status,
        display_order: r.order || r.display_order || 0
      }));
    case 'quotes':
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        location: r.location,
        service: r.service,
        package: r.package,
        description: r.description,
        contact_method: r.contact_method,
        status: r.status,
        notes: r.notes,
        date: r.created_at
      }));
    case 'messages':
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        service: r.service,
        message: r.message,
        status: r.status,
        notes: r.notes,
        date: r.created_at
      }));
    case 'activity':
      return rows.map(r => ({
        id: r.id,
        action: r.action,
        icon: r.icon,
        user_email: r.user_email,
        metadata: r.metadata,
        timestamp: new Date(r.created_at).getTime()
      }));
    default:
      return rows;
  }
}

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

app.get('/api/site-data', async (req, res) => {
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
      blog: blog.map(b => ({ ...b })) ,
      published_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch site data:', error.message || error);
    res.status(500).json({ error: 'Failed to load site content.' });
  }
});

app.get('/api/admin/all', async (req, res) => {
  try {
    const [settingsRow, statsRow, services, packages, testimonials, team, faq, projects, blog, quotes, messages, activity] = await Promise.all([
      queryOne('SELECT * FROM site_settings ORDER BY updated_at DESC LIMIT 1'),
      queryOne('SELECT * FROM site_stats ORDER BY updated_at DESC LIMIT 1'),
      queryRows('SELECT * FROM services ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM packages ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM testimonials ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM team_members ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM faq_items ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM projects ORDER BY display_order ASC, id ASC'),
      queryRows('SELECT * FROM blog_posts ORDER BY date DESC, id DESC'),
      queryRows('SELECT * FROM quotes ORDER BY created_at DESC'),
      queryRows('SELECT * FROM contacts ORDER BY created_at DESC'),
      queryRows('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50')
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
      quotes: quotes.map(q => ({ ...q, date: q.created_at })),
      messages: messages.map(m => ({ ...m, date: m.created_at })),
      activity: activity.map(a => ({ ...a, timestamp: new Date(a.created_at).getTime() }))
    });
  } catch (error) {
    console.error('Failed to fetch admin content:', error.message || error);
    res.status(500).json({ error: 'Failed to load admin content.' });
  }
});

app.post('/api/admin/bulk', async (req, res) => {
  const { type, items } = req.body;
  const table = getAdminTable(type);

  if (!table || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid bulk save request.' });
  }

  try {
    await pool.query(`BEGIN`);
    if (type === 'quotes' || type === 'messages' || type === 'activity') {
      // Do not bulk replace user-submitted content or activity logs
      await pool.query(`COMMIT`);
      return res.status(400).json({ error: 'Bulk writes are not supported for this content type.' });
    }

    await pool.query(`DELETE FROM ${table}`);

    const insertPromises = items.map(item => {
      switch (type) {
        case 'services':
          return pool.query(
            `INSERT INTO services (id, title, slug, category, description, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [item.id, item.title, item.slug, item.category, item.description, item.status, item.display_order, item.image || null]
          );
        case 'packages':
          return pool.query(
            `INSERT INTO packages (id, name, price, price_label, category, specs, status, featured, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [item.id, item.name, item.price || 0, item.price_label || item.priceLabel || null, item.category, item.specs, item.status, item.featured || false, item.display_order, item.image || null]
          );
        case 'projects':
          return pool.query(
            `INSERT INTO projects (id, title, location, service, description, date, status, image, image2, client, testimonial, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [item.id, item.title, item.location, item.service, item.description, item.date || null, item.status, item.image || null, item.image2 || null, item.client || null, item.testimonial || null, item.display_order]
          );
        case 'blog':
          return pool.query(
            `INSERT INTO blog_posts (id, title, slug, category, author, excerpt, content, date, status, image, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [item.id, item.title, item.slug, item.category, item.author, item.excerpt || null, item.content || null, item.date || null, item.status, item.image || null, item.tags || null]
          );
        case 'testimonials':
          return pool.query(
            `INSERT INTO testimonials (id, client, location, service, rating, text, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [item.id, item.client, item.location, item.service, item.rating || 5, item.text, item.status, item.display_order, item.image || null]
          );
        case 'team':
          return pool.query(
            `INSERT INTO team_members (id, name, role, bio, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [item.id, item.name, item.role, item.bio, item.status, item.display_order, item.image || null]
          );
        case 'faq':
          return pool.query(
            `INSERT INTO faq_items (id, question, answer, category, status, display_order) VALUES ($1,$2,$3,$4,$5,$6)`,
            [item.id, item.question, item.answer, item.category, item.status, item.display_order]
          );
        default:
          return Promise.resolve();
      }
    });

    await Promise.all(insertPromises);
    await pool.query(`COMMIT`);
    res.json({ success: true });
  } catch (error) {
    await pool.query(`ROLLBACK`);
    console.error('Bulk save failed:', error.message || error);
    res.status(500).json({ error: 'Bulk save failed.' });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  const settings = req.body;
  try {
    const existing = await queryOne('SELECT id FROM site_settings ORDER BY updated_at DESC LIMIT 1');
    if (existing) {
      await pool.query(
        `UPDATE site_settings SET company=$1, tagline=$2, phone=$3, email=$4, whatsapp=$5, address=$6, hours=$7, facebook=$8, instagram=$9, tiktok=$10, linkedin=$11, youtube=$12, twitter=$13, ga=$14, updated_at=now() WHERE id=$15`,
        [settings.company || null, settings.tagline || null, settings.phone || null, settings.email || null, settings.whatsapp || null, settings.address || null, settings.hours || null, settings.facebook || null, settings.instagram || null, settings.tiktok || null, settings.linkedin || null, settings.youtube || null, settings.twitter || null, settings.ga || null, existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO site_settings (company, tagline, phone, email, whatsapp, address, hours, facebook, instagram, tiktok, linkedin, youtube, twitter, ga) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [settings.company || null, settings.tagline || null, settings.phone || null, settings.email || null, settings.whatsapp || null, settings.address || null, settings.hours || null, settings.facebook || null, settings.instagram || null, settings.tiktok || null, settings.linkedin || null, settings.youtube || null, settings.twitter || null, settings.ga || null]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Save settings failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

app.put('/api/admin/stats', async (req, res) => {
  const stats = req.body;
  try {
    const existing = await queryOne('SELECT id FROM site_stats ORDER BY updated_at DESC LIMIT 1');
    if (existing) {
      await pool.query(
        `UPDATE site_stats SET boreholes=$1, solar=$2, clients=$3, counties=$4, updated_at=now() WHERE id=$5`,
        [stats.boreholes || 0, stats.solar || 0, stats.clients || 0, stats.counties || 0, existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO site_stats (boreholes, solar, clients, counties) VALUES ($1,$2,$3,$4)`,
        [stats.boreholes || 0, stats.solar || 0, stats.clients || 0, stats.counties || 0]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Save stats failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save stats.' });
  }
});

app.post('/api/admin/activity', async (req, res) => {
  const { action, icon, user_email, metadata } = req.body;
  try {
    await pool.query(
      `INSERT INTO activity_log (action, icon, user_email, metadata) VALUES ($1,$2,$3,$4)`,
      [action || null, icon || null, user_email || null, metadata || null]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Activity log failed:', error.message || error);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
});

app.delete('/api/admin/:type/:id', async (req, res) => {
  const type = req.params.type;
  const id = parseInt(req.params.id, 10);
  const table = getAdminTable(type);

  if (!table || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid delete request.' });
  }

  try {
    await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete failed:', error.message || error);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

app.post('/api/site-data/publish', async (req, res) => {
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

    const filePath = path.join(__dirname, 'site-data.json');
    await fs.promises.writeFile(filePath, JSON.stringify(siteData, null, 2), 'utf8');

    res.json({ success: true, message: 'Site data published to site-data.json' });
  } catch (error) {
    console.error('Publish site data failed:', error.message || error);
    res.status(500).json({ error: 'Failed to publish site data.' });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, async () => {
  if (connectionString) {
    await initDb();
  }
  console.log(`Server running on port ${PORT}`);
});
