'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Room } from '@/types'
import Sidebar from './Sidebar'
import ChatRoom from './ChatRoom'
import CallModal from './callModal'
import { useWebRTC } from './useWebRTC'
import type { CurrentUser } from './UserMenu'

interface Props {
  currentUser: CurrentUser
  allUsers: Profile[]
}

export default function ChatLayout({ currentUser: initialUser, allUsers }: Props) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>(allUsers)
  const [currentUser, setCurrentUser] = useState(initialUser)
  const supabase = createClient()
  const activeRoomRef = useRef<Room | null>(null)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  useEffect(() => {
    setProfiles(allUsers)
  }, [allUsers])

  useEffect(() => {
    setCurrentUser(initialUser)
  }, [initialUser])

  function handleProfileUpdate(updates: Partial<CurrentUser>) {
    setCurrentUser((prev) => ({ ...prev, ...updates }))
  }

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
          setCurrentUser((prev) => {
            if (row.id !== prev.id) return prev
            return {
              ...prev,
              name: row.full_name ?? prev.name,
              avatar_url: row.avatar_url ?? prev.avatar_url,
            }
          })
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

  const showChatPanel = Boolean(activeRoom)

  const activeRoomWithLiveUser =
    activeRoom &&
    (() => {
      const live = profiles.find((p) => p.id === activeRoom.other_user.id)
      return live
        ? { ...activeRoom, other_user: live }
        : activeRoom
    })()

  return (
    <div className="flex h-dvh overflow-hidden bg-wa-bg">
      <Sidebar
        currentUser={currentUser}
        allUsers={profiles}
        activeOtherUserId={activeRoom?.other_user.id ?? null}
        onSelectUser={handleSelectUser}
        onProfileUpdate={handleProfileUpdate}
        visible={!showChatPanel}
      />

      <div
        className={`min-h-0 min-w-0 flex-1 flex-col ${
          showChatPanel ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeRoomWithLiveUser ? (
          <ChatRoom
            key={activeRoomWithLiveUser.id}
            room={activeRoomWithLiveUser}
            currentUser={currentUser}
            onDeleteChat={handleDeleteChat}
            onStartCall={startCall}
            onBack={() => setActiveRoom(null)}
          />
        ) : (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 border-l border-wa-border bg-wa-bg px-6">
            <MessageCircle
              className="h-14 w-14 text-wa-green"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="max-w-sm text-center">
              <p className="mb-1.5 text-lg font-semibold text-white/70">
                ChatApp
              </p>
              <p className="text-sm text-white/50">
                {profiles.length === 0
                  ? 'No other users yet. Share the app with someone!'
                  : 'Select a chat to start messaging'}
              </p>
            </div>
          </div>
        )}
      </div>

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
