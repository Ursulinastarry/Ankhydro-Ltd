import { Request, Response } from 'express';
import { pool, queryOne, queryRows } from '../db.js';

type AdminRow = Record<string, any>;

type AdminPayload = {
  type?: string;
  items?: any[];
};

function getAdminTable(type?: string) {
  const map: Record<string, string> = {
    services: 'services',
    packages: 'packages',
    projects: 'projects',
    blog: 'blog_posts',
    testimonials: 'testimonials',
    team: 'team_members',
    faq: 'faq_items',
    quotes: 'quotes',
    messages: 'contacts',
    activity: 'activity_log',
  };
  return (type && map[type]) || null;
}

function formatBulkPayload(type: string, rows: any[]) {
  switch (type) {
    case 'services':
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        description: r.description,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null,
      }));
    case 'packages':
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.price || 0,
        priceLabel: r.priceLabel || r.price_label || null,
        category: r.category,
        service_id: r.service_id || null,
        specs: r.specs,
        status: r.status,
        featured: r.featured || false,
        display_order: r.order || r.display_order || 0,
        image: r.image || null,
      }));
    case 'projects':
      return rows.map((r) => ({
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
        display_order: r.order || r.display_order || 0,
      }));
    case 'blog':
      return rows.map((r) => ({
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
        tags: r.tags,
      }));
    case 'testimonials':
      return rows.map((r) => ({
        id: r.id,
        client: r.client,
        location: r.location,
        service: r.service,
        rating: r.rating || 5,
        text: r.text,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null,
      }));
    case 'team':
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        bio: r.bio,
        status: r.status,
        display_order: r.order || r.display_order || 0,
        image: r.image || null,
      }));
    case 'faq':
      return rows.map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        category: r.category,
        status: r.status,
        display_order: r.order || r.display_order || 0,
      }));
    default:
      return rows;
  }
}

export async function getAdminAll(_req: Request, res: Response) {
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
      queryRows('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50'),
    ]);

    res.json({
      settings: settingsRow,
      stats: statsRow,
      services: formatBulkPayload('services', services),
      packages: formatBulkPayload('packages', packages),
      testimonials: formatBulkPayload('testimonials', testimonials),
      team: formatBulkPayload('team', team),
      faq: formatBulkPayload('faq', faq),
      projects: formatBulkPayload('projects', projects),
      blog: formatBulkPayload('blog', blog),
      quotes: (quotes as any[]).map((q) => ({ ...q, date: q.created_at })),
      messages: (messages as any[]).map((m) => ({ ...m, date: m.created_at })),
      activity: (activity as any[]).map((a) => ({ ...a, timestamp: new Date(a.created_at).getTime() })),
    });
  } catch (error: any) {
    console.error('Failed to fetch admin content:', error.message || error);
    res.status(500).json({ error: 'Failed to load admin content.' });
  }
}

export async function bulkSave(req: Request, res: Response) {
  const { type, items } = req.body as AdminPayload;
  const table = getAdminTable(type);

  if (!table || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid bulk save request.' });
  }

  if (type === 'quotes' || type === 'messages' || type === 'activity') {
    return res.status(400).json({ error: 'Bulk writes are not supported for this content type.' });
  }

  try {
    await pool.query('BEGIN');
    await pool.query(`DELETE FROM ${table}`);

    const insertPromises = items.map((item) => {
      switch (type) {
        case 'services':
          return pool.query(
            `INSERT INTO services (id, title, slug, category, description, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [item.id, item.title, item.slug, item.category, item.description, item.status, item.display_order, item.image || null]
          );
        case 'packages':
          return pool.query(
            `INSERT INTO packages (id, name, price, price_label, category, service_id, specs, status, featured, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [item.id, item.name, item.price || 0, item.price_label || item.priceLabel || null, item.category, item.service_id || null, item.specs, item.status, item.featured || false, item.display_order, item.image || null]
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
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Bulk save failed:', error.message || error);
    res.status(500).json({ error: 'Bulk save failed.' });
  }
}

export async function saveSettings(req: Request, res: Response) {
  const settings = req.body as Record<string, any>;

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
  } catch (error: any) {
    console.error('Save settings failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
}

export async function saveStats(req: Request, res: Response) {
  const stats = req.body as Record<string, any>;

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
  } catch (error: any) {
    console.error('Save stats failed:', error.message || error);
    res.status(500).json({ error: 'Failed to save stats.' });
  }
}

export async function logActivity(req: Request, res: Response) {
  const { action, icon, user_email, metadata } = req.body as Record<string, any>;

  try {
    await pool.query(
      `INSERT INTO activity_log (action, icon, user_email, metadata) VALUES ($1,$2,$3,$4)`,
      [action || null, icon || null, user_email || null, metadata || null]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Activity log failed:', error.message || error);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
}

export async function patchItem(req: Request<{ type: string; id: string }>, res: Response) {
  const typeParam = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const type = typeParam;
  const id = Number(idParam);
  const table = getAdminTable(type);

  if (!table || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid patch request.' });
  }

  const allowedFields = {
    quotes: ['status', 'notes'],
    messages: ['status', 'notes'],
  } as const;

  if (!(type in allowedFields)) {
    return res.status(400).json({ error: 'Patch not supported for this content type.' });
  }

  const allowed = allowedFields[type as keyof typeof allowedFields];
  const updates = Object.keys(req.body).filter((key): key is (typeof allowed)[number] => allowed.includes(key as any));
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  const values = updates.map((key) => (req.body as Record<string, any>)[key]);
  const setClause = updates.map((key, idx) => `${key}=$${idx + 1}`).join(', ');

  try {
    await pool.query(`UPDATE ${table} SET ${setClause} WHERE id=$${updates.length + 1}`, [...values, id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Patch failed:', error.message || error);
    res.status(500).json({ error: 'Failed to update item.' });
  }
}

export async function deleteItem(req: Request<{ type: string; id: string }>, res: Response) {
  const type = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(idParam);
  const table = getAdminTable(type);

  if (!table || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid delete request.' });
  }

  try {
    await pool.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete failed:', error.message || error);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
}
