# ANK Hydro Limited — Express + PostgreSQL Backend

This repository now includes a Node/Express backend with PostgreSQL integration for contact and quote form submissions.

## What was added

- `package.json` with Express, pg, nodemailer, cors, dotenv, nodemon
- `index.js` Express server with `/api/contact` and `/api/quote`
- Postgres table creation for `contacts` and `quotes`
- email notification support via SMTP
- `.env.example` for Railway / local config

## Deployment notes

### Local development

1. Copy `.env.example` to `.env`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start server:
   ```bash
   npm run dev
   ```

### Railway deployment

1. Create a new Railway project and connect a PostgreSQL plugin.
2. Railway will provide `DATABASE_URL`.
3. Add SMTP environment variables if email is needed.
4. Deploy the repo and Railway will use `npm start`.

### Environment variables

- `DATABASE_URL` — PostgreSQL connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `EMAIL_FROM`, `EMAIL_TO`

## Notes

- The front-end now uses `/api/contact` and `/api/quote` instead of `send-email.php`.
- Existing PHP form handlers can be removed once the backend is live.
