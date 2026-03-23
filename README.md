# Axis

Personal alignment system. Define the areas of life that matter to you, track your commitments, and see when you're drifting.

Your domains orbit a central sun like planets in a solar system. Stay consistent and they stay close. Neglect them and they drift out.

**Open** your system. See where you stand.
**Align** by writing one commitment per domain. Not a plan. An action.
**Execute** and come back when you're ready for the next one.

No feeds. No notifications. No streaks. No gamification.

---

## Why this exists

Most productivity tools focus on organizing tasks. Very few help when you feel scattered, conflicted, or unsure what actually matters.

Axis treats life as a set of domains: health, career, relationships, a side project, whatever you care about. Each one can drift over time. The goal is to make that visible and actionable.

This started as something I wanted for myself. There are days where everything feels slightly off. Not terrible, just unclear. I wanted a tool I could open that would help me reset quickly, figure out what actually matters, and move forward.

Axis is not meant to keep you inside the app. It is meant to help you get clear and then leave to execute in real life.

---

## Features

- Interactive orrery (solar system) visualization with draggable planets
- Per-user domains with custom colors, identity, vision, reason, and cost
- Commitment tracking per domain
- Auto-drift: planets move out of orbit after 72 hours without a commitment
- Archive domains to put them on hold
- Align flow: guided reset through all active domains
- Multi-user auth with email and password
- Admin-controlled demo orrery for visitors who haven't signed in
- Quote overlay on commitment with 500 action-focused quotes
- Custom dark-themed HSV color picker
- Keyboard navigation (1-9 keys, Escape)
- Mobile responsive with full touch support

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL via Prisma ORM 7 |
| Auth | NextAuth v5 (Auth.js), credentials provider, JWT sessions |
| Passwords | bcryptjs |
| Typography | Geist, Geist Mono, Playfair Display |
| Language | TypeScript 5 |

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL database running locally or hosted

### Setup

```bash
git clone https://github.com/YuvrajKashyap/Axis.git
cd Axis

npm install
```

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/axis"
AUTH_SECRET="generate-with-npx-auth-secret"
ADMIN_EMAIL="your@email.com"
```

Then:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: seed sample data

```bash
npm run seed
```

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SECRET` | NextAuth secret for JWT signing. Generate with `npx auth secret` | Yes |
| `ADMIN_EMAIL` | Email of the admin account. Their orrery becomes the public demo for logged-out visitors | No |

---

## Database schema

| Model | Purpose |
|---|---|
| **User** | Accounts with email/password auth |
| **Domain** | Life areas (planets), scoped per user. Compound unique on userId + slug |
| **Commitment** | Actions committed per domain. Used to calculate drift |
| **UserSettings** | Per-user preferences |

Domain status enum: `ALIGNED`, `NEUTRAL`, `DRIFTING`, `ARCHIVED`.

Drift is computed at read time. If the most recent commitment in a domain is older than 72 hours, the domain's effective status becomes `DRIFTING` regardless of its stored status.

---

## Project structure

```
src/
  app/
    page.tsx              # Homepage: orrery or demo
    Orrery.tsx            # Solar system visualization (client component)
    orrery-actions.ts     # Server actions for orbit updates and domain creation
    orrery.css            # Orrery-specific styles and animations
    domain/[slug]/        # Domain detail page with commitments and editing
      DomainView.tsx      # Domain client component (color picker, edit mode, quotes)
      actions.ts          # Server actions for domain CRUD
      quotes.ts           # 500 action-focused quotes
      domain.css          # Domain page animations
    reset/                # Align flow: guided commitment entry across all domains
    login/                # Auth page with signup and signin
    how/                  # Explanation page
    api/auth/             # NextAuth API route handler
  lib/
    auth.ts               # NextAuth configuration
    auth-actions.ts       # Server actions for signup, login, logout
    prisma.ts             # Prisma client singleton
    get-data.ts           # Data fetching with drift computation
    demo-data.ts          # Fallback demo domains if no admin account exists
prisma/
    schema.prisma         # Database schema
    seed.ts               # Optional seed script
```

---

## How auth works

1. Users sign up with name, email, and password (hashed with bcrypt)
2. Sessions use JWT strategy via NextAuth v5
3. All data queries are scoped by the authenticated user's ID from the session
4. Logged-out visitors see the admin's orrery as a read-only demo (configurable via `ADMIN_EMAIL`)
5. If no admin account exists, a hardcoded fallback demo is shown

---

## Deployment

Built for Vercel.

1. Push code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`)
4. Deploy

For the database, use a hosted PostgreSQL provider like Neon, Supabase, or Railway.

```bash
# Always verify the build passes before deploying
npm run build
```

---

## Author

Yuvraj Kashyap

---

## License

Private project.
