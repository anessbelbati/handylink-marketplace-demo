# HandyLink (Two-Sided Marketplace Demo)

HandyLink is a fully working two-sided services marketplace built with Next.js (App Router) + Convex + Clerk + Tailwind.

## Features

- Auth with Clerk and role-based onboarding (client / provider)
- Provider browsing with filters + map view + search (name + bio)
- Client flow: create requests, receive quotes, accept/decline, mark complete, leave reviews
- Provider flow: profile editor, request feed, submit quotes, reviews + quotes dashboard
- Real-time messaging with unread counts + notifications
- Admin dashboard with KPIs, charts, user moderation, reviews moderation, category management (incl. reorder)
- Seed script that populates realistic data (and seeds demo images)

## Tech

- Next.js (App Router)
- Convex (DB + realtime functions + file storage)
- Clerk (auth)
- Tailwind CSS

## Local Setup

1. Install deps

```bash
npm install
```

2. Create your local env

Copy `.env.example` -> `.env.local` and fill in values.

3. Start Convex + Next.js

```bash
npm run dev:all
```

4. Seed demo data

```bash
npm run seed -- --force
```

This seeds categories, providers, requests, quotes, conversations, reviews, and also seeds demo images (Unsplash source with a Picsum fallback).

## Clerk + Convex Auth

1. In Clerk Dashboard, create an app and grab:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

2. Create a JWT template for Convex

- Clerk Dashboard -> JWT Templates -> New template
- Name: `convex`
- Audience: `convex`

3. Set Convex env vars

Convex needs the Clerk issuer URL:

```bash
npx convex env set CLERK_ISSUER_URL "https://YOUR-CLERK-ISSUER-URL"
```

Admin claim uses a Convex env var:

```bash
npx convex env set ADMIN_CLAIM_SECRET "your-long-random-secret"
```

Then open `/admin` while signed in and enter that secret once to mark your user as admin.

## Deployment (Vercel + Convex)

1. Deploy Convex

```bash
npx convex deploy
```

2. Set Vercel env vars

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

3. Set Convex production env vars

- `CLERK_ISSUER_URL`
- `ADMIN_CLAIM_SECRET`

4. Seed production (optional)

```bash
npm run seed -- --force
```

## Notes

- Public browsing is available without auth (`/`, `/providers`, `/providers/[id]`).
- Dashboard and admin routes require Clerk auth.

