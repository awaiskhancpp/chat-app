export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_seen: string;
}

export interface Room {
  id: string;
  created_at: string;
  other_user: Profile;
  last_message: Message | null;
  unread_count: number;
  deleted_at: string | null;
}

export interface Message {
  id: string;
  content: string | null;
  user_id: string;
  user_email: string;
  user_name: string | null;
  room_id: string;
  created_at: string;
  updated_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_system: boolean | null;
  delivered_at: string | null;
  seen_at: string | null;
  is_edited: boolean | null;
}