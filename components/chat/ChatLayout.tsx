'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Room } from '@/types'
import Sidebar from './Sidebar'
import ChatRoom from './ChatRoom'
import CallModal from './callModal'
import { useWebRTC } from './useWebRTC'

interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

interface Props {
  currentUser: CurrentUser
  allUsers: Profile[]
}

export default function ChatLayout({ currentUser, allUsers }: Props) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>(allUsers)
  const supabase = createClient()
  const activeRoomRef = useRef<Room | null>(null)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  useEffect(() => {
    setProfiles(allUsers)
  }, [allUsers])

  /** Supabase Realtime: keep sidebar “last seen” / profile fields live */
  useEffect(() => {
    const channel = supabase
      .channel('profiles-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new as Profile
          setProfiles((prev) =>
            prev.map((p) => (p.id === row.id ? { ...p, ...row } : p))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const postCallSummary = useCallback(async (summary: string) => {
    const room = activeRoomRef.current
    if (!room?.id || !summary.trim()) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: summary,
        room_id: room.id,
        is_system: true,
      }),
    })
  }, [])

  const {
    callState,
    callType,
    incomingCall,
    remoteStream,
    localStream,
    isMuted,
    isCamOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCam,
  } = useWebRTC(currentUser, postCallSummary)

  useEffect(() => {
    const update = () =>
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', currentUser.id)
        .then(() => {})

    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [currentUser.id, supabase])

  async function handleSelectUser(user: Profile) {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ other_user_id: user.id }),
    })

    if (!res.ok) {
      console.error('Failed to get/create room')
      return
    }

    const { room_id, last_message, deleted_at } = await res.json()

    setActiveRoom({
      id: room_id,
      created_at: new Date().toISOString(),
      other_user: user,
      last_message,
      unread_count: 0,
      deleted_at,
    })
  }

  async function handleDeleteChat() {
    if (!activeRoom) return
    await supabase
      .from('room_members')
      .update({ deleted_at: new Date().toISOString() })
      .eq('room_id', activeRoom.id)
      .eq('user_id', currentUser.id)
    setActiveRoom(null)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-wa-bg">
      <Sidebar
        currentUser={currentUser}
        allUsers={profiles}
        activeOtherUserId={activeRoom?.other_user.id ?? null}
        onSelectUser={handleSelectUser}
      />
      {activeRoom ? (
        <ChatRoom
          key={activeRoom.id}
          room={activeRoom}
          currentUser={currentUser}
          onDeleteChat={handleDeleteChat}
          onStartCall={startCall}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 border-l border-wa-border bg-wa-bg">
          <div className="text-[3.5rem] leading-none" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <div className="text-center">
            <p className="mb-1.5 text-lg font-semibold text-wa-text">
              ChatApp
            </p>
            <p className="text-sm text-wa-text2">
              {profiles.length === 0
                ? 'No other users yet. Share the app with someone!'
                : 'Select a user from the sidebar to start chatting'}
            </p>
          </div>
        </div>
      )}

      {callState !== 'idle' && (
        <CallModal
          callState={callState}
          callType={callType}
          localStream={localStream}
          remoteStream={remoteStream}
          incomingName={incomingCall?.fromName}
          isMuted={isMuted}
          isCamOff={isCamOff}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleCam={toggleCam}
        />
      )}
    </div>
  )
}
