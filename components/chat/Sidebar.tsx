'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

interface Props {
  currentUser: CurrentUser
  allUsers: Profile[]
  /** Highlights the row for the user whose DM is open */
  activeOtherUserId: string | null
  onSelectUser: (user: Profile) => void
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.slice(0, 2).toUpperCase()
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-[49px] h-[49px] text-sm', lg: 'w-12 h-12 text-sm' }[size]

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-wa-green flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

function formatLastSeen(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'online'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Sidebar({
  currentUser,
  allUsers,
  activeOtherUserId,
  onSelectUser,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const displayName = currentUser.name ?? currentUser.email.split('@')[0]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="w-[360px] min-w-[280px] max-w-[400px] flex flex-col h-full bg-wa-panel border-r border-wa-border flex-shrink-0">

      {/* ── Header ── */}
      <div className="flex h-[59px] shrink-0 items-center justify-between gap-2 border-b border-wa-divider bg-wa-panel2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={displayName} url={currentUser.avatar_url} size="sm" />
          <span className="min-w-0 truncate text-sm font-medium text-wa-text">
            {displayName}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* New chat icon */}
          <button
            type="button"
            title="New chat"
            className="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent text-wa-icon transition-colors hover:bg-wa-hover"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
            </svg>
          </button>

          {/* Menu icon */}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent text-wa-icon transition-colors hover:bg-wa-hover"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 px-3 py-2">
        <div className="flex h-9 min-h-9 items-center gap-2 rounded-lg bg-wa-input px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-wa-text2" fill="currentColor" aria-hidden>
            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
          </svg>
          <span className="min-w-0 truncate text-sm text-wa-text2">Search or start new chat</span>
        </div>
      </div>

      {/* ── Contact list ── */}
      <div className="flex-1 overflow-y-auto">
        {allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-6 text-center">
            <p className="text-sm text-wa-text2">No users yet</p>
            <p className="text-xs text-wa-text2 opacity-60 mt-1">Register with another account to start chatting</p>
          </div>
        ) : (
          allUsers.map((user) => {
            const name = user.full_name ?? user.email.split('@')[0]
            const isOnline = (Date.now() - new Date(user.last_seen).getTime()) / 1000 < 90
            const isActive = activeOtherUserId === user.id

            return (
              <button
                type="button"
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`flex w-full cursor-pointer items-center gap-3 border-0 border-b border-wa-divider bg-wa-panel px-3 py-3 text-left text-wa-text transition-colors ${
                  isActive ? 'bg-wa-active' : 'hover:bg-wa-hover'
                }`}
              >
                {/* Avatar + online indicator */}
                <div className="relative flex-shrink-0">
                  <Avatar name={name} url={user.avatar_url} size="md" />
                  {isOnline && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-wa-green rounded-full border-2 border-wa-panel" />
                  )}
                </div>

                {/* Name + last seen */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-normal text-wa-text truncate">{name}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isOnline ? 'text-wa-green' : 'text-wa-text2'}`}>
                    {isOnline ? 'online' : formatLastSeen(user.last_seen)}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}