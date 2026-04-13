export interface Message {
  id: string;
  content: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  created_at: string;
  updated_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_system: boolean | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type MessageInsert = Pick<Message, "content" | "user_id" | "user_email" | "user_name">;
export type MessageUpdate = Pick<Message, "content">;
