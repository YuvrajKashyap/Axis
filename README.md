# Axis

Axis is a personal alignment and execution tool built to help a user reset mentally, regain clarity, and move into intentional action.

Core idea:

Open → Reset → Act

It is not designed to keep you inside the app. It is designed to help you get clear and then leave to execute in real life.

---

## Purpose

Most productivity tools focus on organizing tasks.

Very few help when you feel mentally scattered, conflicted, or unsure what actually matters.

Axis is built to solve that.

It treats life as a set of domains such as:

- Health  
- Career  
- Relationships  
- Finance  
- Mindset  
- Environment  

Each domain can drift over time. The goal is to make that visible and actionable.

With Axis, the user can:

- see what areas of life need attention  
- understand what feels off and why  
- reconnect to priorities  
- commit to a clear next step  

The goal is clarity and action, not tracking for the sake of tracking.

---


## Author

---

## Why I built this

This started as something I wanted for myself.

There are days where everything feels slightly off. Not terrible, just unclear. I wanted a tool I could open that would help me reset quickly, figure out what actually matters, and move forward.

Most apps I tried did not help with that. They either tried to keep me inside the app, added too many features, or turned everything into tracking and dashboards without helping me make a real decision.

So I built my own version.

Axis is not meant to be perfect or for everyone. It is meant to be useful.

I decided to put it online for two reasons.

First, someone else might find it helpful.

Second, I think code should be shared. A lot of projects never leave someone’s local machine. I want to get in the habit of building things and actually shipping them.

---

## Personal note

This project also reflects how I think about building.

I care about tools that actually change behavior, not just organize information. I like systems that help people think clearly and act with intention.

Axis is one step in that direction. It is simple right now, but it is being built with a clear purpose behind it.


## What the app does

Axis helps a user:

- view life as a set of active domains  
- identify what is stable versus drifting  
- open a domain and reflect on its current state  
- examine reasons, costs, or pressures  
- define a next action  
- exit the app with direction  

It is part reflection tool, part alignment system, and part execution reset.

---

## MVP direction

The first version is intentionally simple.

### Core MVP goals

- create and manage life domains  
- view a focus or reset home screen  
- open a domain detail page  
- store reflections  
- create a commitment or next action  
- keep everything fast and personal  

### What is not included in MVP

- multi-user complexity  
- full production authentication  
- notifications  
- social features  
- advanced analytics  
- heavy 3D complexity early on  

The focus is getting the core loop working first.

---

## Tech stack

### Frontend
- Next.js  
- React  
- TypeScript  
- Tailwind CSS  
- shadcn/ui  

### Backend
- Next.js route handlers and server logic  

### Database
- Supabase Postgres  
- Prisma ORM  

### Forms and validation
- React Hook Form  
- Zod  

### Animation
- Framer Motion  

### 3D (planned)
- Three.js  
- React Three Fiber  
- Drei  

### Hosting (planned)
- Vercel  
- Supabase  

---

## Why this stack

The stack is chosen to keep things simple and fast for a solo builder.

- one codebase  
- minimal setup  
- fast UI development  
- easy deployment  
- enough flexibility without early complexity  

The goal is to build a real product, not overengineer.

---

## Current status

This project is in early setup.

Completed:

- Next.js app setup  
- TypeScript and Tailwind configured  
- local development working  
- Git initialized  
- GitHub repository connected  

Next steps:

- Prisma schema  
- Supabase connection  
- initial data model  
- domain CRUD  
- focus screen  
- domain detail flow  
- commitment flow  
- simple 3D layer later  

---

## How to run locally

### 1. Clone the repo

```bash
git clone https://github.com/YuvrajKashyap/Axis.git
cd Axis