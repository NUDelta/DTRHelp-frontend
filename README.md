# DTRHelp

A lightweight tool for NU CS 394 DTR teams to anonymously share concerns and connect mentees with mentors.

## Features

- **Message Board** (`/board`) — anonymous message board where anyone can post and reply
- **Pair Connect** (`/pair-connect`) — mentees submit concerns, mentors rate them by willingness to help, and a matching algorithm pairs them

## Tech Stack

- React 19 + Vite
- React Router v7
- Supabase (Postgres + realtime)
- Deployed on Vercel

## Local Dev Setup

**Prerequisites:** Node.js 18+, npm

```bash
git clone <repo-url>
cd DTRHelp-frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Supabase Setup

Create a free project at [supabase.com](https://supabase.com), then run the following SQL in the Supabase SQL editor:

```sql
-- Message board
create table messages (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Pair connect
create table concerns (
  id uuid primary key default gen_random_uuid(),
  person_name text unique not null,
  concern_text text not null,
  help_wanted_text text not null,
  anonymous boolean default false,
  created_at timestamptz default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  mentor_name text not null,
  concern_id uuid references concerns(id) on delete cascade,
  score integer not null,
  unique(mentor_name, concern_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  mentor_name text not null,
  concern_id uuid references concerns(id) on delete cascade
);
```

Enable Row Level Security on each table and add a policy allowing anon read/write (or disable RLS for a private team tool).

## Connecting Your Supabase Project

Open `src/supabaseclient.js` and replace the URL and anon key with your project's values (found in Supabase → Project Settings → API):

```js
const supabaseUrl = "https://YOUR-PROJECT.supabase.co";
const supabaseKey = "YOUR-ANON-KEY";
```

## Updating the People List

The Pair Connect dropdown is populated from `src/hard-coded-data/people.json`. Edit that file to match your team roster:

```json
["Alice", "Bob", "Carol"]
```

## Deploying to Vercel

1. Push the repo to GitHub
2. Import it in [Vercel](https://vercel.com) — framework preset: Vite
3. No environment variables needed (credentials are in `supabaseclient.js`)
4. `vercel.json` already configures the SPA rewrite rule so deep links work

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
