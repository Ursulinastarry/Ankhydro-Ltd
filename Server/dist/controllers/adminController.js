import crypto from 'crypto';
import { pool, queryOne, queryRows } from '../db.js';
// ---------------------------------------------------------------------
// AUTH
//
// Backed by the `admin` table (see admin_auth_schema.sql): email + a
// bcrypt password hash, checked via Postgres's pgcrypto crypt(). On
// success we hand back a signed, expiring token (HMAC-SHA256 over a JSON
// payload — no extra npm dependency needed). Every other handler in this
// file calls requireAuth() as its first line and bails out with 401 if
// the token is missing, malformed, tampered with, or expired.
//
// Set ADMIN_TOKEN_SECRET in your environment in production. The fallback
// below only exists so local dev doesn't crash if it's unset — it is NOT
// safe to run production traffic on the fallback secret.
// ---------------------------------------------------------------------
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'dev-only-insecure-secret-set-ADMIN_TOKEN_SECRET-env-var';
if (!process.env.ADMIN_TOKEN_SECRET) {
    console.warn('[auth] ADMIN_TOKEN_SECRET is not set — using an insecure development fallback. Set this env var in production.');
}
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
// Manual base64url helpers built on plain 'base64' (supported by every
// @types/node version) instead of passing the 'base64url' encoding string
// directly to Buffer/Hmac methods, which only newer @types/node versions
// recognize and otherwise fails to compile with a BufferEncoding type error.
function toBase64Url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function fromBase64Url(input) {
    const restored = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (restored.length % 4)) % 4;
    return Buffer.from(restored + '='.repeat(padLength), 'base64');
}
function signToken(email) {
    const payload = JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS });
    const payloadB64 = toBase64Url(payload);
    const sigBuf = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest();
    return `${payloadB64}.${toBase64Url(sigBuf)}`;
}
function verifyToken(token) {
    const parts = token.split('.');
    if (parts.length !== 2)
        return null;
    const [payloadB64, sig] = parts;
    const expectedSigBuf = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest();
    const sigBuf = fromBase64Url(sig);
    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
        return null; // signature doesn't match — token was forged or corrupted
    }
    try {
        const payload = JSON.parse(fromBase64Url(payloadB64).toString('utf8'));
        if (!payload.exp || Date.now() > payload.exp)
            return null; // expired
        if (!payload.email)
            return null;
        return { email: payload.email };
    }
    catch {
        return null;
    }
}
/**
 * Call as the first line of any protected handler:
 *   if (!requireAuth(req, res)) return;
 * Sends the 401 response itself on failure, so callers just need to return.
 */
export function requireAuth(req, res) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) {
        res.status(401).json({ error: 'Authentication required.' });
        return false;
    }
    const verified = verifyToken(token);
    if (!verified) {
        res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
        return false;
    }
    req.adminEmail = verified.email;
    return true;
}
export async function adminLogin(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        // crypt($2, password) re-hashes the submitted password with the same
        // salt that's embedded in the stored hash, so this comparison never
        // sees or needs the plaintext password stored anywhere.
        const admin = await queryOne(`SELECT id, email FROM admin WHERE email = $1 AND password = crypt($2, password)`, [email, password]);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = signToken(admin.email);
        res.json({ success: true, token, email: admin.email });
    }
    catch (error) {
        console.error('Admin login failed:', error.message || error);
        res.status(500).json({ error: 'Login failed.' });
    }
}
export async function adminChangePassword(req, res) {
    if (!requireAuth(req, res))
        return;
    const { newPassword } = req.body;
    const email = req.adminEmail; // set by requireAuth from the verified token — you can only ever change your own password this way
    if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
        await pool.query(`UPDATE admin SET password = crypt($1, gen_salt('bf')), updated_at = now() WHERE email = $2`, [newPassword, email]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Change password failed:', error.message || error);
        res.status(500).json({ error: 'Failed to change password.' });
    }
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
        activity: 'activity_log',
    };
    return (type && map[type]) || null;
}
function formatBulkPayload(type, rows) {
    switch (type) {
        case 'services':
            return rows.map((r) => ({
                id: r.id,
                title: r.title,
                slug: r.slug,
                category: r.category,
                description: r.description,
                status: r.status,
                order: r.display_order || 0,
                display_order: r.display_order || 0,
                image: r.image || null,
            }));
        case 'packages':
            return rows.map((r) => ({
                id: r.id,
                name: r.name,
                price: r.price || 0,
                priceLabel: r.price_label || null,
                category: r.category,
                service_id: r.service_id || null,
                specs: r.specs,
                status: r.status,
                featured: r.featured || false,
                order: r.display_order || 0,
                display_order: r.display_order || 0,
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
                order: r.display_order || 0,
                display_order: r.display_order || 0,
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
                order: r.display_order || 0,
                display_order: r.display_order || 0,
                image: r.image || null,
            }));
        case 'team':
            return rows.map((r) => ({
                id: r.id,
                name: r.name,
                role: r.role,
                bio: r.bio,
                status: r.status,
                order: r.display_order || 0,
                display_order: r.display_order || 0,
                image: r.image || null,
            }));
        case 'faq':
            return rows.map((r) => ({
                id: r.id,
                question: r.question,
                answer: r.answer,
                category: r.category,
                status: r.status,
                order: r.display_order || 0,
                display_order: r.display_order || 0,
            }));
        default:
            return rows;
    }
}
export async function getAdminAll(req, res) {
    if (!requireAuth(req, res))
        return;
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
            quotes: quotes.map((q) => ({ ...q, date: q.created_at })),
            messages: messages.map((m) => ({ ...m, date: m.created_at })),
            activity: activity.map((a) => ({ ...a, timestamp: new Date(a.created_at).getTime() })),
        });
    }
    catch (error) {
        console.error('Failed to fetch admin content:', error.message || error);
        res.status(500).json({ error: 'Failed to load admin content.' });
    }
}
export async function bulkSave(req, res) {
    if (!requireAuth(req, res))
        return;
    const { type, items } = req.body;
    const table = getAdminTable(type);
    if (!table || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid bulk save request.' });
    }
    if (type === 'quotes' || type === 'messages' || type === 'activity') {
        return res.status(400).json({ error: 'Bulk writes are not supported for this content type.' });
    }
    // Use a single checked-out client for the whole transaction. Calling
    // pool.query() directly for BEGIN/COMMIT/ROLLBACK is unsafe — each call
    // can be routed to a different pooled connection, so the transaction
    // never actually wraps the statements and a connection can be left
    // "idle in transaction" until the pool eventually breaks.
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM ${table}`);
        for (const item of items) {
            switch (type) {
                case 'services':
                    await client.query(`INSERT INTO services (id, title, slug, category, description, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [item.id, item.title, item.slug, item.category, item.description, item.status, item.display_order || item.order || 0, item.image || null]);
                    break;
                case 'packages':
                    await client.query(`INSERT INTO packages (id, name, price, price_label, category, service_id, specs, status, featured, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [item.id, item.name, item.price || 0, item.price_label || item.priceLabel || null, item.category, item.service_id || null, item.specs, item.status, item.featured || false, item.display_order || item.order || 0, item.image || null]);
                    break;
                case 'projects':
                    await client.query(`INSERT INTO projects (id, title, location, service, description, date, status, image, image2, client, testimonial, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [item.id, item.title, item.location, item.service, item.description, item.date || null, item.status, item.image || null, item.image2 || null, item.client || null, item.testimonial || null, item.display_order || item.order || 0]);
                    break;
                case 'blog':
                    await client.query(`INSERT INTO blog_posts (id, title, slug, category, author, excerpt, content, date, status, image, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [item.id, item.title, item.slug, item.category, item.author, item.excerpt || null, item.content || null, item.date || null, item.status, item.image || null, item.tags || null]);
                    break;
                case 'testimonials':
                    await client.query(`INSERT INTO testimonials (id, client, location, service, rating, text, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [item.id, item.client, item.location, item.service, item.rating || 5, item.text, item.status, item.display_order || item.order || 0, item.image || null]);
                    break;
                case 'team':
                    await client.query(`INSERT INTO team_members (id, name, role, bio, status, display_order, image) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [item.id, item.name, item.role, item.bio, item.status, item.display_order || item.order || 0, item.image || null]);
                    break;
                case 'faq':
                    await client.query(`INSERT INTO faq_items (id, question, answer, category, status, display_order) VALUES ($1,$2,$3,$4,$5,$6)`, [item.id, item.question, item.answer, item.category, item.status, item.display_order || item.order || 0]);
                    break;
            }
        }
        await client.query('COMMIT');
        res.json({ success: true });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk save failed:', error.message || error);
        res.status(500).json({ error: 'Bulk save failed.' });
    }
    finally {
        client.release();
    }
}
export async function saveSettings(req, res) {
    if (!requireAuth(req, res))
        return;
    const settings = req.body;
    try {
        const existing = await queryOne('SELECT id FROM site_settings ORDER BY updated_at DESC LIMIT 1');
        if (existing) {
            await pool.query(`UPDATE site_settings SET company=$1, tagline=$2, phone=$3, email=$4, whatsapp=$5, address=$6, hours=$7, facebook=$8, instagram=$9, tiktok=$10, linkedin=$11, youtube=$12, twitter=$13, ga=$14, updated_at=now() WHERE id=$15`, [settings.company || null, settings.tagline || null, settings.phone || null, settings.email || null, settings.whatsapp || null, settings.address || null, settings.hours || null, settings.facebook || null, settings.instagram || null, settings.tiktok || null, settings.linkedin || null, settings.youtube || null, settings.twitter || null, settings.ga || null, existing.id]);
        }
        else {
            await pool.query(`INSERT INTO site_settings (company, tagline, phone, email, whatsapp, address, hours, facebook, instagram, tiktok, linkedin, youtube, twitter, ga) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [settings.company || null, settings.tagline || null, settings.phone || null, settings.email || null, settings.whatsapp || null, settings.address || null, settings.hours || null, settings.facebook || null, settings.instagram || null, settings.tiktok || null, settings.linkedin || null, settings.youtube || null, settings.twitter || null, settings.ga || null]);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Save settings failed:', error.message || error);
        res.status(500).json({ error: 'Failed to save settings.' });
    }
}
export async function saveStats(req, res) {
    if (!requireAuth(req, res))
        return;
    const stats = req.body;
    try {
        const existing = await queryOne('SELECT id FROM site_stats ORDER BY updated_at DESC LIMIT 1');
        if (existing) {
            await pool.query(`UPDATE site_stats SET boreholes=$1, solar=$2, clients=$3, counties=$4, updated_at=now() WHERE id=$5`, [stats.boreholes || 0, stats.solar || 0, stats.clients || 0, stats.counties || 0, existing.id]);
        }
        else {
            await pool.query(`INSERT INTO site_stats (boreholes, solar, clients, counties) VALUES ($1,$2,$3,$4)`, [stats.boreholes || 0, stats.solar || 0, stats.clients || 0, stats.counties || 0]);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Save stats failed:', error.message || error);
        res.status(500).json({ error: 'Failed to save stats.' });
    }
}
export async function logActivity(req, res) {
    if (!requireAuth(req, res))
        return;
    const { action, icon, user_email, metadata } = req.body;
    try {
        await pool.query(`INSERT INTO activity_log (action, icon, user_email, metadata) VALUES ($1,$2,$3,$4)`, [action || null, icon || null, user_email || null, metadata || null]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Activity log failed:', error.message || error);
        res.status(500).json({ error: 'Failed to log activity.' });
    }
}
export async function patchItem(req, res) {
    if (!requireAuth(req, res))
        return;
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
    };
    if (!(type in allowedFields)) {
        return res.status(400).json({ error: 'Patch not supported for this content type.' });
    }
    const allowed = allowedFields[type];
    const updates = Object.keys(req.body).filter((key) => allowed.includes(key));
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const values = updates.map((key) => req.body[key]);
    const setClause = updates.map((key, idx) => `${key}=$${idx + 1}`).join(', ');
    try {
        await pool.query(`UPDATE ${table} SET ${setClause} WHERE id=$${updates.length + 1}`, [...values, id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Patch failed:', error.message || error);
        res.status(500).json({ error: 'Failed to update item.' });
    }
}
export async function deleteItem(req, res) {
    if (!requireAuth(req, res))
        return;
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
    }
    catch (error) {
        console.error('Delete failed:', error.message || error);
        res.status(500).json({ error: 'Failed to delete item.' });
    }
}
