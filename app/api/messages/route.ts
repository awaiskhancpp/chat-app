import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body;

  const isEmptyText =
  !content || typeof content !== "string" || content.trim().length === 0;
  const { attachment_url, attachment_name } = body;
  if (isEmptyText && !attachment_url) {
    return NextResponse.json(
      { error: "Message or attachment required" },
      { status: 400 }
    );
  }


const { is_system } = body;

const { data, error } = await supabase
  .from("messages")
  .insert({
    content: content?.trim() || null,
    user_id: user.id,
    user_email: user.email ?? "",
    user_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    attachment_url: attachment_url ?? null,
    attachment_name: attachment_name ?? null,
    is_system: is_system ?? false,
  })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
