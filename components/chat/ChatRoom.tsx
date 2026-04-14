'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message, Room } from '@/types'
import MessageItem from './MessageItem'
import MessageInput from './MessageInput'

interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

interface Props {
  room: Room
  currentUser: CurrentUser
  onDeleteChat: () => void
  onStartCall: (targetUserId: string, type: 'audio' | 'video') => void
}

function formatLastSeen(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 90) return 'online'
  if (diff < 3600) return `last seen ${Math.floor(diff / 60)}m ago`
  const t = new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `last seen ${t}`
}

export default function ChatRoom({ room, currentUser, onDeleteChat, onStartCall }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const otherUser = room.other_user
  const displayName = otherUser.full_name ?? otherUser.email.split('@')[0]
  const initials = displayName.slice(0, 2).toUpperCase()
  const isOnline =
    (Date.now() - new Date(otherUser.last_seen).getTime()) / 1000 < 90

  async function handleSend(
    content: string,
    attachmentUrl?: string,
    attachmentName?: string
  ) {
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content || null,
          attachment_url: attachmentUrl ?? null,
          attachment_name: attachmentName ?? null,
          room_id: room.id,
        }),
      })
      if (res.ok) {
        const created = (await res.json()) as Message
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev
          return [...prev, created]
        })
      }
    } finally {
      setSending(false)
    }
  }

  // Load messages
  useEffect(() => {
    async function load() {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (room.deleted_at) {
        query = query.gt('created_at', room.deleted_at)
      }

      const { data } = await query
      setMessages((data as Message[]) ?? [])
    }
    load()
  }, [room.id, room.deleted_at, supabase])

  // Mark incoming messages as seen
  useEffect(() => {
    const unseen = messages.filter(
      (m) => m.user_id !== currentUser.id && !m.seen_at
    )
    if (unseen.length === 0) return
    const ids = unseen.map((m) => m.id)
    supabase
      .from('messages')
      .update({ seen_at: new Date().toISOString() })
      .in('id', ids)
      .then(() => {})
  }, [messages, currentUser.id, supabase])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, supabase])

  useEffect(() => {
    if (!showMenu) return
    const handler = () => setShowMenu(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showMenu])

  async function handleEdit(id: string, content: string) {
    await fetch(`/api/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
      {/* Header — WhatsApp / Figma-style chat top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-wa-border bg-wa-panel2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            {otherUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={otherUser.avatar_url}
                alt={displayName}
                className="h-[42px] w-[42px] rounded-full object-cover"
              />
            ) : (
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-wa-green text-[0.9rem] font-bold text-white">
                {initials}
              </div>
            )}
            {isOnline && (
              <span className="absolute bottom-px right-px h-2.5 w-2.5 rounded-full border-2 border-wa-panel2 bg-wa-green" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold leading-tight text-wa-text">
              {displayName}
            </p>
            <p
              className={`text-xs ${isOnline ? 'text-wa-green' : 'text-wa-text2'}`}
            >
              {formatLastSeen(otherUser.last_seen)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onStartCall(otherUser.id, 'audio')}
            title="Start audio call"
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-wa-border bg-wa-panel text-wa-text transition-colors hover:bg-wa-green hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 10.5V6a3 3 0 1 0-6 0v4.5a3 3 0 1 0 6 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 10.5a7 7 0 0 1-14 0M12 17.5V21M9 21h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onStartCall(otherUser.id, 'video')}
            title="Start video call"
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-wa-border bg-wa-panel text-wa-text transition-colors hover:bg-wa-green hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 8.5H5.5a2.5 2.5 0 0 0-2.5 2.5v2a2.5 2.5 0 0 0 2.5 2.5H15a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 15 8.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="m17.5 11 3.8-2.1a.8.8 0 0 1 1.2.7v4.8a.8.8 0 0 1-1.2.7L17.5 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu((s) => !s)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-xl text-wa-text2 hover:bg-wa-hover"
            >
              <span className="block translate-y-[-2px] font-bold leading-none tracking-tighter">
                &middot;&middot;&middot;
              </span>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-[110%] z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-wa-border bg-wa-panel2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onDeleteChat()
                    setShowMenu(false)
                  }}
                  className="w-full cursor-pointer border-0 bg-transparent px-4 py-3 text-left text-sm text-wa-danger transition-colors hover:bg-wa-panel"
                >
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto bg-wa-bg px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-full bg-wa-panel px-5 py-2 text-[0.8125rem] text-wa-text2">
              Say hi to {displayName}!
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isOwn={msg.user_id === currentUser.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
