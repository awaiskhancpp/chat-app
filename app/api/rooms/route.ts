import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { other_user_id } = body;

    if (!other_user_id) {
      return NextResponse.json({ error: "other_user_id required" }, { status: 400 });
    }

    // Find existing shared room
    const { data: myMemberships } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("user_id", user.id);

    const myRoomIds = myMemberships?.map((r) => r.room_id) ?? [];
    let roomId: string | null = null;

    if (myRoomIds.length > 0) {
      const { data: shared } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", other_user_id)
        .in("room_id", myRoomIds);

      if (shared && shared.length > 0) {
        roomId = shared[0].room_id;
      }
    }

    // Create new room if none exists
    if (!roomId) {
      const { data: newRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({})
        .select("id")
        .single();

      if (roomError || !newRoom) {
        console.error("Room create error:", roomError);
        return NextResponse.json({ error: roomError?.message ?? "Failed to create room" }, { status: 500 });
      }

      roomId = newRoom.id;

      const { error: membersError } = await supabase
        .from("room_members")
        .insert([
          { room_id: roomId, user_id: user.id },
          { room_id: roomId, user_id: other_user_id },
        ]);

      if (membersError) {
        console.error("Members insert error:", membersError);
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
    }

    // Fetch last message
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch membership for deleted_at
    const { data: membership } = await supabase
      .from("room_members")
      .select("deleted_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      room_id: roomId,
      last_message: lastMsg ?? null,
      deleted_at: membership?.deleted_at ?? null,
    });

  } catch (err) {
    console.error("Unexpected error in /api/rooms:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}