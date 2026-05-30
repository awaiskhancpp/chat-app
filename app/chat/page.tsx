import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatLayout from "@/components/chat/ChatLayout";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profiles, error }, { data: ownProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('full_name', { ascending: true }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (error) console.error('profiles fetch error:', error.message)

  const currentUser = {
    id: user.id,
    email: user.email ?? '',
    name:
      ownProfile?.full_name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      null,
    avatar_url:
      ownProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  }

  return <ChatLayout currentUser={currentUser} allUsers={profiles ?? []} />;
}
