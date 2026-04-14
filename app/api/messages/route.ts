import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100)

  if (roomId) query = query.eq('room_id', roomId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { content, attachment_url, attachment_name, is_system, room_id } = body

  if (!content?.trim() && !attachment_url) {
    return NextResponse.json(
      { error: 'Content or attachment is required' },
      { status: 400 }
    )
  }

  if (!room_id) {
    return NextResponse.json({ error: 'room_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      content: content?.trim() || null,
      user_id: user.id,
      user_email: user.email ?? '',
      user_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      attachment_url: attachment_url ?? null,
      attachment_name: attachment_name ?? null,
      is_system: is_system ?? false,
      room_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
