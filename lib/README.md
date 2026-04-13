# `lib/` — Supabase Client Helpers

This directory provides the two different Supabase client instances required by Next.js App Router — one for the browser and one for the server.

---

## Files

```
lib/
└── supabase/
    ├── client.ts   # Browser client — for Client Components
    └── server.ts   # Server client — for Server Components & API routes
```

---

## `client.ts` — Browser Client

```ts
import { createBrowserClient } from "@supabase/ssr";
```

Used inside `"use client"` components (e.g., `ChatRoom`, `LoginForm`). Reads cookies automatically in the browser context.

**When to use:** Any component with `"use client"` at the top that needs Supabase access (auth, realtime subscriptions).

**Usage:**
```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

---

## `server.ts` — Server Client

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
```

Used inside Server Components and API Route Handlers. Reads and writes cookies via Next.js `cookies()`. The `setAll` method is wrapped in `try/catch` because setting cookies in Server Component render is silently ignored (only relevant in Route Handlers and Server Actions).

**When to use:** `app/page.tsx`, `app/chat/page.tsx`, all `app/api/` route handlers, and `middleware.ts`.

**Usage:**
```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

---

## Why Two Clients?

Next.js App Router separates server and client execution environments. The `@supabase/ssr` package provides environment-specific clients that handle cookie management correctly in each context. Using the wrong client in either environment causes auth session issues.

| Context | Client to use |
|---------|--------------|
| `"use client"` components | `lib/supabase/client.ts` |
| Server Components | `lib/supabase/server.ts` |
| API Route Handlers | `lib/supabase/server.ts` |
| `middleware.ts` | Inline `createServerClient` (has access to `NextRequest`) |
