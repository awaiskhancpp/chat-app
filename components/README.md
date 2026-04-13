# `components/` — UI Components

All React components are split into two sub-folders: `auth/` and `chat/`. Every component is a **Client Component** (`"use client"`) since they handle user interactions.

---

## Directory Structure

```
components/
├── auth/
│   ├── LoginForm.tsx       # Email/password login + Google OAuth button
│   ├── SignupForm.tsx      # Email/password signup + Google OAuth button
│   └── auth.module.css     # Shared styles for both auth forms
│
└── chat/
    ├── ChatRoom.tsx        # Root chat component — manages state, realtime, and handlers
    ├── ChatHeader.tsx      # Top bar: app name, online indicator, user info, logout
    ├── MessageItem.tsx     # Individual message bubble with inline edit/delete
    ├── MessageInput.tsx    # Textarea + send button at the bottom
    └── chat.module.css     # All chat UI styles
```

---

## Auth Components

### `LoginForm`
**File:** `auth/LoginForm.tsx`

Handles two login flows:
- **Email/Password** — calls `supabase.auth.signInWithPassword()`, redirects to `/chat` on success
- **Google OAuth** — calls `supabase.auth.signInWithOAuth({ provider: "google" })`, redirects via the callback route

**Props:** none (self-contained, uses `useRouter`)

---

### `SignupForm`
**File:** `auth/SignupForm.tsx`

Handles two signup flows:
- **Email/Password** — calls `supabase.auth.signUp()` with `full_name` in `user_metadata`
- **Google OAuth** — same as login (Supabase handles new vs. existing accounts)

Shows a success screen after email signup and auto-redirects to `/auth/login` after 3 seconds.

---

## Chat Components

### `ChatRoom`
**File:** `chat/ChatRoom.tsx`

The root chat component. Responsible for:
- Holding the `messages` array in state (seeded from `initialMessages`)
- Subscribing to Supabase Realtime `postgres_changes` for INSERT, UPDATE, DELETE events
- Scrolling to the bottom whenever messages change
- Delegating send/edit/delete to API routes
- Rendering `<ChatHeader />`, the message list, and `<MessageInput />`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `initialMessages` | `Message[]` | Server-fetched messages for instant load |
| `currentUser` | `{ id, email, name }` | Authenticated user info |

---

### `ChatHeader`
**File:** `chat/ChatHeader.tsx`

Displays:
- App logo and name
- A pulsing "Live" badge (Supabase Realtime indicator)
- User avatar (initials), display name, and email
- Sign out button that calls `supabase.auth.signOut()`

---

### `MessageItem`
**File:** `chat/MessageItem.tsx`

Renders a single chat bubble. Key behaviors:
- **Own messages** show action buttons (edit ✎ / delete 🗑) on hover
- **Edit mode** replaces the bubble with a textarea; `Enter` saves, `Escape` cancels
- **Delete** requires a two-step confirmation to prevent accidental deletion
- Displays "edited" tag when `updated_at !== created_at`
- Groups messages from the same user (hides avatar/name for consecutive messages)

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `message` | `Message` | The message data |
| `isOwn` | `boolean` | Whether the current user authored it |
| `isFirst` | `boolean` | Whether to show avatar/name header |
| `onEdit` | `(id, content) => Promise<void>` | Edit handler from ChatRoom |
| `onDelete` | `(id) => Promise<void>` | Delete handler from ChatRoom |

---

### `MessageInput`
**File:** `chat/MessageInput.tsx`

A growing textarea at the bottom of the chat.
- `Enter` submits; `Shift+Enter` adds a newline
- Disabled while a message is being sent
- Clears on submit
