# ChatApp — Real-time Chat with Supabase

A full-stack real-time chat application built with **Next.js 15 App Router**, **Supabase Realtime**, and **TypeScript**. Users can sign up, log in (email/password or Google OAuth), send messages, and edit or delete their own messages live.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Realtime | Supabase Realtime (Postgres Changes) |
| Linting | ESLint 9 (Flat Config) |
| Styling | CSS Modules |

---

## Project Structure

```
chat-app/
├── app/                  # Next.js App Router pages & API routes
│   ├── auth/             # Login, signup, OAuth callback
│   ├── chat/             # Main chat page
│   └── api/messages/     # REST API for CRUD operations
├── components/
│   ├── auth/             # LoginForm, SignupForm
│   └── chat/             # ChatRoom, MessageItem, MessageInput, ChatHeader
├── lib/supabase/         # Supabase client (browser + server)
├── types/                # Shared TypeScript types
├── middleware.ts          # Auth route protection
└── ...config files
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo>
cd chat-app
npm install
```

### 2. Configure Supabase

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Fill in your values from the [Supabase Dashboard](https://app.supabase.com):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up the Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Messages table
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  user_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read messages
CREATE POLICY "Read messages" ON messages
  FOR SELECT TO authenticated USING (true);

-- Users can only insert their own messages
CREATE POLICY "Insert own messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only update their own messages
CREATE POLICY "Update own messages" ON messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can only delete their own messages
CREATE POLICY "Delete own messages" ON messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 4. Configure Google OAuth (optional)

In the Supabase Dashboard → Authentication → Providers → Google:
- Enable Google
- Add your Google OAuth Client ID and Secret
- Set the redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

In Google Cloud Console, add your app's callback URL:
`http://localhost:3000/auth/callback` (for development)

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Folder READMEs

- [`app/README.md`](./app/README.md) — Pages and API routes
- [`components/README.md`](./components/README.md) — UI components
- [`lib/README.md`](./lib/README.md) — Supabase client helpers
- [`types/README.md`](./types/README.md) — Shared TypeScript types
