import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { queryOne, queryRows } from '../db.js';
import { sendEmail } from '../services/emailService.js';

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  message?: string;
};

type QuotePayload = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  service?: string;
  package?: string;
  description?: string;
  contact_method?: string;
};

function getSiteDataMap(row: any) {
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
    ga: row.ga,
  };
}

function getStatsMap(row: any) {
  if (!row) return { boreholes: 0, solar: 0, clients: 0, counties: 0 };
  return {
    boreholes: row.boreholes,
    solar: row.solar,
    clients: row.clients,
    counties: row.counties,
  };
}

export async function health(_req: Request, res: Response) {
  res.json({ status: 'ok', uptime: process.uptime() });
}

export async function submitContact(req: Request, res: Response) {
  const { name, email, phone, service, message } = req.body as ContactPayload;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  try {
    const result = await queryOne(
      'INSERT INTO contacts (name, email, phone, service, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [name, email, phone || null, service || null, message]
    );

    await sendEmail('contact', { name, email, phone, service, message });
    res.json({ success: true, id: (result as any).id });
  } catch (error: any) {
    console.error('Contact submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save contact request.' });
  }
}

export async function submitQuote(req: Request, res: Response) {
  const {
    name,
    email,
    phone,
    location,
    service,
    package: pkg,
    description,
    contact_method,
  } = req.body as QuotePayload;

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
      contact_method,
    });

    res.json({ success: true, id: (result as any).id });
  } catch (error: any) {
    console.error('Quote submit failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save quote request.' });
  }
}

export async function getSiteData(_req: Request, res: Response) {
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
      queryRows('SELECT * FROM blog_posts ORDER BY date DESC, id DESC'),
    ]);

    res.json({
      settings: getSiteDataMap(settingsRow),
      stats: getStatsMap(statsRow),
      services: (services as any[]).map((s) => ({ ...s, order: s.display_order })),
      packages: (packages as any[]).map((p) => ({ ...p, order: p.display_order, priceLabel: p.price_label, service_id: p.service_id })),
      testimonials: (testimonials as any[]).map((t) => ({ ...t, order: t.display_order })),
      team: (team as any[]).map((t) => ({ ...t, order: t.display_order })),
      faq: (faq as any[]).map((f) => ({ ...f, order: f.display_order })),
      projects: (projects as any[]).map((p) => ({ ...p, order: p.display_order })),
      blog: (blog as any[]).map((b) => ({ ...b })),
      published_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to fetch site data:', error.message || error);
    res.status(500).json({ error: 'Failed to load site content.' });
  }
}

export async function publishSiteData(_req: Request, res: Response) {
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
      queryRows('SELECT * FROM blog_posts ORDER BY date DESC, id DESC'),
    ]);

    const siteData = {
      settings: getSiteDataMap(settingsRow),
      stats: getStatsMap(statsRow),
      services: (services as any[]).map((s) => ({ ...s, order: s.display_order })),
      packages: (packages as any[]).map((p) => ({ ...p, order: p.display_order, priceLabel: p.price_label, service_id: p.service_id })),
      testimonials: (testimonials as any[]).map((t) => ({ ...t, order: t.display_order })),
      team: (team as any[]).map((t) => ({ ...t, order: t.display_order })),
      faq: (faq as any[]).map((f) => ({ ...f, order: f.display_order })),
      projects: (projects as any[]).map((p) => ({ ...p, order: p.display_order })),
      blog: (blog as any[]).map((b) => ({ ...b })),
      published_at: new Date().toISOString(),
    };

    const outputPath = path.join(__dirname, '..', '..', '..', 'client', 'site-data.json');
    await fs.promises.writeFile(outputPath, JSON.stringify(siteData, null, 2), 'utf8');

    res.json({ success: true, message: 'Site data published to client/site-data.json' });
  } catch (error: any) {
    console.error('Publish site data failed:', error.message || error);
    res.status(500).json({ error: 'Failed to publish site data.' });
  }
}


