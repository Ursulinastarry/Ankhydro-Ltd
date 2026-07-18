-- =====================================================================
-- ANK HYDRO LIMITED — CORRECTED Database Schema + Seed Data
-- This version matches the ACTUAL backend code (adminController.ts /
-- publicController.ts) exactly — table names, column names, and types.
--
-- If you already ran the earlier "ank_hydro_seed.sql" script, that one
-- used different table/column names (settings, stats, team, faq, blog,
-- "order") than what your Node backend actually queries (site_settings,
-- site_stats, team_members, faq_items, blog_posts, display_order).
-- That mismatch is why every API call was failing silently.
--
-- Drop the old tables first if they exist, then run this file:
--   psql -U your_user -d your_db -f ank_hydro_schema_v2.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Clean slate — drop anything from the earlier mismatched schema
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS settings, stats, team, faq, blog CASCADE;

DROP TABLE IF EXISTS
  site_settings, site_stats, services, packages, testimonials,
  team_members, faq_items, projects, blog_posts, quotes, contacts,
  activity_log, mpesa_orders, file_uploads
CASCADE;

-- ---------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------
CREATE TABLE site_settings (
    id          SERIAL PRIMARY KEY,
    company     TEXT,
    tagline     TEXT,
    phone       TEXT,
    email       TEXT,
    whatsapp    TEXT,
    address     TEXT,
    hours       TEXT,
    facebook    TEXT,
    instagram   TEXT,
    tiktok      TEXT,
    linkedin    TEXT,
    youtube     TEXT,
    twitter     TEXT,
    ga          TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings
    (company, tagline, phone, email, whatsapp, address, hours,
     facebook, instagram, tiktok, linkedin, youtube, twitter, ga)
VALUES
    ('ANK HYDRO LIMITED',
     'Power of technology, get it right for better tomorrow',
     '+254 758 849 293',
     'info@ankhydro.com',
     '+254 758 849 293',
     'Kitui Town, PT Plaza, Room 4, Ground Floor',
     'Mon–Fri: 8AM–5PM, Sat: 8AM–1PM',
     '', '', '', '', '', '', '');

-- ---------------------------------------------------------------------
-- site_stats
-- ---------------------------------------------------------------------
CREATE TABLE site_stats (
    id          SERIAL PRIMARY KEY,
    boreholes   INTEGER NOT NULL DEFAULT 0,
    solar       INTEGER NOT NULL DEFAULT 0,
    clients     INTEGER NOT NULL DEFAULT 0,
    counties    INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_stats (boreholes, solar, clients, counties)
VALUES (150, 200, 500, 15);

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
CREATE TABLE services (
    id             INTEGER PRIMARY KEY,
    title          TEXT NOT NULL,
    slug           TEXT UNIQUE,
    category       TEXT,
    description    TEXT,
    status         TEXT NOT NULL DEFAULT 'published',
    display_order  INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO services (id, title, slug, category, description, status, display_order) VALUES
(1, 'Solar Panel Sales & Installation', 'solar-installation', 'Solar Energy',
   'Professional solar system design, installation, and commissioning.', 'published', 1),
(2, 'Hybrid Domestic Solar System', 'hybrid-solar', 'Solar Energy',
   '5.12 kWh battery package with 550W panels and 3000W inverter.', 'published', 2),
(3, 'Hydrological Survey Services', 'hydrological-survey', 'Water/Borehole',
   'Geophysical surveys to locate underground water before drilling.', 'published', 3),
(4, 'Borehole Drilling Services', 'borehole-drilling', 'Water/Borehole',
   'Professional drilling, casing, development, and test pumping.', 'published', 4),
(5, 'Borehole Rehabilitation & Equipping', 'borehole-rehabilitation', 'Water/Borehole',
   'Restoration and upgrade of existing boreholes.', 'published', 5),
(6, 'Submersible Pump Sales & Installation', 'pump-installation', 'Pumps',
   'Electric and solar pump installation with correct sizing.', 'published', 6),
(7, 'Drip & Overhead Irrigation', 'irrigation', 'Irrigation',
   'Farm irrigation systems with efficient water use.', 'published', 7),
(8, 'Tank Tower Construction', 'tank-tower', 'Infrastructure',
   'Steel tower construction for water storage tanks.', 'published', 8),
(9, 'Solar Structure Construction', 'solar-structure', 'Infrastructure',
   'Ground-mount and custom solar panel structures.', 'published', 9);

-- ---------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------
CREATE TABLE packages (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_label    TEXT,
    category       TEXT,
    service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,
    specs          TEXT,
    status         TEXT NOT NULL DEFAULT 'active',
    featured       BOOLEAN NOT NULL DEFAULT false,
    display_order  INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO packages
    (id, name, price, price_label, category, specs, status, featured, display_order)
VALUES
(1, 'Hybrid Domestic Solar Package', 0, 'Call us to enquire', 'Solar',
   '5.12 kWh Lithium Battery, 550W Panels, 3000ES kW Inverter, DC Disconnect, Changeover Switch',
   'active', true, 1),
(2, 'Solar Pump 200W', 0, 'Call us to enquire', 'Pumps',
   '200W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport',
   'active', false, 2),
(3, 'Solar Pump 500W', 0, 'Call us to enquire', 'Pumps',
   '500W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport',
   'active', false, 3),
(4, 'Solar Pump 750W', 0, 'Call us to enquire', 'Pumps',
   '750W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport',
   'active', false, 4),
(5, 'Solar Pump 1300W', 0, 'Call us to enquire', 'Pumps',
   '1300W Pump, Controller, 340W Panels, 50M HDPE Pipe, Cables, Transport',
   'active', true, 5);

-- ---------------------------------------------------------------------
-- testimonials
-- ---------------------------------------------------------------------
CREATE TABLE testimonials (
    id             INTEGER PRIMARY KEY,
    client         TEXT NOT NULL,
    location       TEXT,
    service        TEXT,
    rating         SMALLINT NOT NULL DEFAULT 5,
    text           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'published',
    display_order  INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO testimonials (id, client, location, service, rating, text, status, display_order) VALUES
(1, 'John M.', 'Kitui County', 'Borehole Drilling', 5,
   'ANK Hydro drilled our borehole and the water yield exceeded expectations. Professional team and great follow-up support.',
   'published', 1),
(2, 'Mary W.', 'Machakos County', 'Hybrid Solar', 5,
   'The hybrid solar system has completely changed our electricity situation. No more blackouts and our bills have dropped significantly.',
   'published', 2),
(3, 'Peter K.', 'Makueni County', 'Pump & Irrigation', 5,
   'They installed a solar-powered pump and set up drip irrigation. Our water costs dropped to zero and crop yield has improved.',
   'published', 3);

-- ---------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------
CREATE TABLE team_members (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    role           TEXT,
    bio            TEXT,
    status         TEXT NOT NULL DEFAULT 'active',
    display_order  INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO team_members (id, name, role, bio, status, display_order) VALUES
(1, 'Technical Director', 'Solar & Water Systems',
   'Leading our technical team with years of experience in solar installation and borehole drilling.',
   'active', 1),
(2, 'Operations Manager', 'Project Delivery',
   'Ensuring every project is delivered on time, on budget, and to the highest quality.',
   'active', 2),
(3, 'Field Engineers', 'Installation & Maintenance',
   'Certified technicians handling installations, testing, and after-sales support.',
   'active', 3);

-- ---------------------------------------------------------------------
-- faq_items
-- ---------------------------------------------------------------------
CREATE TABLE faq_items (
    id             INTEGER PRIMARY KEY,
    question       TEXT NOT NULL,
    answer         TEXT NOT NULL,
    category       TEXT,
    status         TEXT NOT NULL DEFAULT 'published',
    display_order  INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO faq_items (id, question, answer, category, status, display_order) VALUES
(1, 'How much does it cost to drill a borehole in Kenya?',
   'Costs vary depending on depth, geological conditions, and location. Contact us for a free assessment and quote.',
   'Borehole & Water', 'published', 1),
(2, 'What does the Hybrid Domestic Solar Package include?',
   '5.12 kWh battery, 550W panels, 3000ES kW inverter, DC disconnect, changeover switch. Call us for current pricing.',
   'Solar Energy', 'published', 2),
(3, 'Do you offer after-sales support?',
   'Yes, we provide 24/7 availability for breakdowns, servicing, and maintenance.',
   'General', 'published', 3);

-- ---------------------------------------------------------------------
-- projects (empty for now — table ready for the admin "Projects" section)
-- ---------------------------------------------------------------------
CREATE TABLE projects (
    id             INTEGER PRIMARY KEY,
    title          TEXT NOT NULL,
    location       TEXT,
    service        TEXT,
    description    TEXT,
    date           DATE,
    status         TEXT NOT NULL DEFAULT 'published',
    image          TEXT,
    image2         TEXT,
    client         TEXT,
    testimonial    TEXT,
    display_order  INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- blog_posts (empty for now — table ready for the admin "Blog" section)
-- ---------------------------------------------------------------------
CREATE TABLE blog_posts (
    id          INTEGER PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE,
    category    TEXT,
    author      TEXT,
    excerpt     TEXT,
    content     TEXT,
    date        DATE,
    status      TEXT NOT NULL DEFAULT 'draft',
    image       TEXT,
    tags        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- quotes (from the "Request a Quote" form)
-- ---------------------------------------------------------------------
CREATE TABLE quotes (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL,
    phone           TEXT,
    location        TEXT NOT NULL,
    service         TEXT,
    package         TEXT,
    description     TEXT NOT NULL,
    contact_method  TEXT,
    status          TEXT NOT NULL DEFAULT 'New',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- contacts (from the "Contact Us" form — admin.js calls this "messages")
-- ---------------------------------------------------------------------
CREATE TABLE contacts (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    service     TEXT,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Unread',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- activity_log (admin dashboard recent-activity feed)
-- ---------------------------------------------------------------------
CREATE TABLE activity_log (
    id          SERIAL PRIMARY KEY,
    action      TEXT,
    icon        TEXT,
    user_email  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- mpesa_orders (checkout / STK push flow)
-- ---------------------------------------------------------------------
CREATE TABLE mpesa_orders (
    id                   SERIAL PRIMARY KEY,
    customer_name        TEXT,
    customer_email       TEXT,
    phone                TEXT NOT NULL,
    service              TEXT,
    package_name         TEXT,
    amount               NUMERIC(12,2) NOT NULL,
    currency             TEXT NOT NULL DEFAULT 'KES',
    account_reference    TEXT NOT NULL,
    transaction_desc     TEXT,
    delivery_address     TEXT,
    status               TEXT NOT NULL DEFAULT 'pending',
    checkout_request_id  TEXT,
    merchant_request_id  TEXT,
    receipt_number       TEXT,
    transaction_id       TEXT,
    result_code          INTEGER,
    result_desc          TEXT,
    callback_payload     JSONB,
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- file_uploads (admin image uploads)
-- ---------------------------------------------------------------------
CREATE TABLE file_uploads (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL,
    section     TEXT,
    item_id     TEXT,
    url         TEXT NOT NULL,
    mime_type   TEXT,
    size        BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

-- =====================================================================
-- Quick sanity check after running this file:
--   SELECT * FROM services;
--   SELECT * FROM packages;
-- Then hit your live endpoint directly:
--   curl https://ankhydro-ltd-production.up.railway.app/api/site-data
-- It should return real data instead of a 500 error.
-- =====================================================================-- =====================================================================
-- ANK HYDRO LIMITED — Admin authentication table
--
-- Adds a real, database-backed admin account instead of the old
-- hardcoded admin@ankhydro.com / admin123 check that lived only in the
-- browser's localStorage (and could be reset by anyone who opened the
-- login page's dev tools).
--
-- Passwords are never stored in plaintext. This uses Postgres's built-in
-- pgcrypto extension (bcrypt via crypt()/gen_salt('bf')) so you don't need
-- to add a bcrypt npm package just to seed or rotate a password — you can
-- do it straight from SQL.
--
-- Run:
--   psql -U your_user -d your_db -f admin_auth_schema.sql
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,  -- bcrypt hash (via crypt(...)), NEVER plaintext
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed one default admin account so you can log in for the first time.
-- CHANGE THIS PASSWORD immediately after your first login — see the
-- "rotating a password" note at the bottom of this file.
INSERT INTO admin (email, password)
VALUES ('admin@ankhydro.com', crypt('admin123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- =====================================================================
-- Adding another admin user later:
--   INSERT INTO admin (email, password)
--   VALUES ('someone@ankhydro.com', crypt('their-new-password', gen_salt('bf')));
--
-- Rotating/resetting a password:
--   UPDATE admin SET password = crypt('their-new-password', gen_salt('bf')),
--          updated_at = now()
--   WHERE email = 'admin@ankhydro.com';
--
-- Verifying a login manually (this is exactly what adminController.ts
-- runs, parameterized, to check a submitted password):
--   SELECT id, email FROM admin
--   WHERE email = 'admin@ankhydro.com'
--     AND password = crypt('admin123', password);
-- =====================================================================