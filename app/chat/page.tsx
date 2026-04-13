import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatRoom from "@/components/chat/ChatRoom";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <ChatRoom
      initialMessages={messages ?? []}
      currentUser={{
        id: user.id,
        email: user.email ?? "",
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      }}
    />
  );
}
