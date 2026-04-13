# `types/` — Shared TypeScript Types

All shared TypeScript interfaces and type aliases live here to avoid duplication across the codebase.

---

## `index.ts`

### `Message`
Represents a row in the `messages` Supabase table.

```ts
interface Message {
  id: string;          // UUID primary key
  content: string;     // Message text
  user_id: string;     // FK → auth.users.id
  user_email: string;  // Denormalized for display (email doesn't change often)
  user_name: string | null; // From user_metadata at send time
  created_at: string;  // ISO 8601 timestamp
  updated_at: string;  // ISO 8601 timestamp (same as created_at if never edited)
}
```

### `Profile`
Represents an optional `profiles` table (not used in current migrations but included for extensibility).

```ts
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

### `MessageInsert`
Type for inserting a new message (picks only the fields the client sends):
```ts
type MessageInsert = Pick<Message, "content" | "user_id" | "user_email" | "user_name">;
```

### `MessageUpdate`
Type for updating a message (only `content` is editable):
```ts
type MessageUpdate = Pick<Message, "content">;
```

---

## Usage

Import anywhere in the project:

```ts
import type { Message, MessageInsert } from "@/types";
```
