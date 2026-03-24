# Axis

## Live

https://axis.yuvrajkashyap.com

Axis is fully deployed and running in production.
Create an account and use it live.



A personal alignment system built around life domains, commitments, and execution.

Axis is not a task manager, habit tracker, or productivity feed. It is designed to help a user quickly regain clarity across the areas of life that matter most, commit to a concrete next action, and leave the app to execute.

Core loop: Open → Align → Execute

## Why I built it

Most productivity tools optimize for retention, complexity, or organizational sprawl. Axis is built around a different idea:

- represent major life areas as living domains
- make drift visible
- reduce each session to one meaningful commitment
- push the user back into action instead of deeper app usage

The result is a personal operating system centered on alignment, not engagement.

## What the app does

Axis gives each user a personal orrery: a solar-system-inspired interface where domains orbit around a central sun.

From there, users can:

- create and manage life domains
- visually inspect domain status and drift
- open a domain and write a one-line commitment
- use a guided reset flow across multiple domains
- return to action immediately after committing

It is intentionally minimal:

- no feeds
- no notifications
- no streaks
- no gamification
- no generic dashboard clutter

## Core user experience

### Homepage / Orrery

After signing in, users land on a personalized orrery showing their domains as planets orbiting a central sun.

The homepage supports:

- clicking a domain to enter its detail page
- dragging active planets to adjust orbit radius
- resetting active orbits from the sun
- keyboard navigation
- starting an alignment flow across domains

### Domain detail

Each domain has a dedicated page with:

- name
- identity
- vision
- primary reason
- primary cost
- color
- status
- commitment input
- recent commitment history

Users can also edit the domain directly from this view.

### Commitment flow

The core interaction is a single action input:

Today I will...

Submitting a commitment triggers a full-screen quote overlay and routes the user either:

- back to the homepage
- to the next domain in the alignment chain

### Reset flow

Axis includes a guided reset flow at /reset that steps through all non-archived domains one at a time, allowing the user to enter a commitment for each.

## Features

### User system

- email and password sign up
- email and password sign in
- per-user data isolation
- JWT-based session handling via Auth.js

### Domain system

- create domains from homepage
- per-user slugs
- rename and delete domains
- edit identity, vision, primary reason, primary cost
- set color and status
- status types: ALIGNED, DRIFTING, ARCHIVED

### Orrery

- animated solar-system UI
- draggable planets with persisted orbit radius
- orbit reset from the sun
- visual distinction between domain states
- automatic drift based on latest commitment

### Commitments

- create one-line commitments
- view history
- clear history
- batch submission through reset flow

### Alignment

- Align entrypoint from homepage
- sequential domain flow
- one commitment per domain

### Demo + admin

- public demo mode
- internal demo user
- admin-only edit path

### Design exploration

- /designs/*
- /domaindesign/*
- /signupdesign/*

## Tech stack

- Next.js 16 App Router
- TypeScript
- React 19
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM
- Auth.js credentials auth
- bcryptjs
- Geist + Playfair fonts

## Architecture

- App Router structure under src/app
- server components for data loading
- client components for UI
- server actions for mutations
- Prisma used directly
- global Prisma singleton
- route-level mutation handling

### Routes

- / homepage
- /login auth
- /domain/[slug] domain detail
- /reset reset flow
- /how product explanation
- /designs/* UI experiments

## Database

### User
- id, email, password, name, timestamps

### Domain
- userId, name, slug
- identity, vision
- primaryReason, primaryCost
- nextMove, currentReality, standard, proof
- color, status
- positionX, positionY, positionZ

Unique: userId + slug

### Commitment
- userId, domainId, text, completed, timestamps

### UserSettings
- theme

## Auth

- credentials-based auth
- JWT sessions
- session.user.id from token

### Isolation

- queries scoped by userId
- domain access scoped by userId + slug
- write actions verify ownership
- reset flow validates domain ownership

## Security

App enforces user scoping at the application layer. Database-level policies should be configured for full production hardening.

## Local setup

Install:
npm install

Env:
DATABASE_URL=your_postgres_connection_string
AUTH_SECRET=your_auth_secret
ADMIN_EMAIL=optional

Prisma:
npx prisma generate
npx prisma migrate deploy

Optional seed:
npm run seed

Run:
npm run dev

Build:
npm run build

## Deployment

Required env vars:

- DATABASE_URL
- AUTH_SECRET
- ADMIN_EMAIL optional

Apply migrations:
npx prisma migrate deploy

## Notable details

- orrery built with DOM and requestAnimationFrame
- orbit persistence
- drift computed dynamically
- quote overlay after commit
- align flow uses query state
- multi-user via relational ownership

## Limitations

- some schema fields unused in UI
- design routes exist in production
- no automated tests
- some personalized copy remains
- some sandbox routes query live data

## Status

Axis is a fully shipped full-stack product with:

- auth
- multi-user system
- database persistence
- interactive UI
- reset system
- production deployment

Represents full lifecycle:

- idea
- spec
- architecture
- UI exploration
- build
- auth
- database
- deployment

## License

Private project unless otherwise specified.
