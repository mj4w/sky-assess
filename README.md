# SkyAssess

SkyAssess is a Next.js 16 + Supabase flight training platform for registration, scheduling, debriefing, and evaluations.

## 1) Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2) Required environment variables

Set these in `.env.local` (and in production secrets):

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `SMTP_FROM_EMAIL` (optional, falls back to `GMAIL_USER`)

## 3) Production hardening included

- `reactStrictMode` enabled
- compression enabled
- `x-powered-by` disabled
- security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
- HSTS in production
- dynamic `robots.txt` and `sitemap.xml`

## 4) Deployment checklist

1. Configure all environment variables.
2. Confirm Supabase RLS policies for `profiles`, `flight_ops_assignments`, `ppl_debriefs`, and `student_instructor_feedback`.
3. Run lint and build:
   ```bash
   npm run lint
   npm run build
   ```
4. Deploy with HTTPS and set `NEXT_PUBLIC_APP_URL` to your real domain.
5. Test critical flows:
   - register/login
   - role redirects (`admin`, `flightops`, `student`, `instructor`)
   - flight assignment notifications
   - debrief submission + email delivery
   - instructor evaluation submission

## 5) Scripts

- `npm run dev` — local development
- `npm run lint` — ESLint checks
- `npm run build` — production build
- `npm run start` — serve production build
