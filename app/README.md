# `app/` — Next.js App Router

This directory contains all Next.js App Router pages, layouts, and API route handlers.

---

## Directory Structure

```
app/
├── layout.tsx              # Root layout — sets global fonts, metadata, and CSS
├── page.tsx                # Root redirect → /chat or /auth/login based on auth state
├── globals.css             # Global CSS variables, resets, fonts
│
├── auth/
│   ├── layout.tsx          # Centered layout with radial gradient background
│   ├── login/
│   │   └── page.tsx        # Renders <LoginForm />
│   ├── signup/
│   │   └── page.tsx        # Renders <SignupForm />
│   └── callback/
│       └── route.ts        # GET handler — exchanges OAuth code for session
│
├── chat/
│   ├── layout.tsx          # Full-height flex layout for chat UI
│   └── page.tsx            # Server Component — fetches initial messages & user, renders <ChatRoom />
│
└── api/
    └── messages/
        ├── route.ts        # GET (list messages), POST (create message)
        └── [id]/
            └── route.ts    # PATCH (edit message), DELETE (delete message)
```

---

## Pages

### `/` — `app/page.tsx`
Server component that checks authentication and redirects:
- Authenticated → `/chat`
- Unauthenticated → `/auth/login`

### `/auth/login` — `app/auth/login/page.tsx`
Renders the `LoginForm` client component. Protected by middleware (redirects to `/chat` if already logged in).

### `/auth/signup` — `app/auth/signup/page.tsx`
Renders the `SignupForm` client component.

### `/auth/callback` — `app/auth/callback/route.ts`
OAuth callback route. Exchanges the authorization `code` from Google for a Supabase session, then redirects to `/chat`. Falls back to `/auth/login?error=auth_callback_failed` on failure.

### `/chat` — `app/chat/page.tsx`
Server component that:
1. Verifies the user is authenticated (redirects to `/auth/login` if not)
2. Fetches the last 100 messages from Supabase ordered by `created_at`
3. Passes them to `<ChatRoom />` as `initialMessages`

---

## API Routes

All routes use the **server-side Supabase client** and enforce authentication. Row-Level Security (RLS) in Supabase provides an additional database-level ownership check.

### `GET /api/messages`
Returns all messages ordered by `created_at` ascending (limit 100).

### `POST /api/messages`
Creates a new message. Requires `{ content: string }` in the request body. Sets `user_id`, `user_email`, and `user_name` from the authenticated session.

**Validation:**
- Must be authenticated
- `content` must be a non-empty string

### `PATCH /api/messages/[id]`
Updates the content of a message by ID. Requires `{ content: string }`.

**Authorization:** Verifies `user_id` of the message matches the authenticated user before updating.

### `DELETE /api/messages/[id]`
Deletes a message by ID.

**Authorization:** Verifies `user_id` of the message matches the authenticated user before deleting.
