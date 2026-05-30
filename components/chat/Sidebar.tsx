'use client'

import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import {
  formatLastSeenSidebar,
  isUserOnline,
} from '@/lib/format-last-seen'
import type { Profile } from '@/types'
import Avatar from './Avatar'
import UserMenu, { type CurrentUser } from './UserMenu'

interface Props {
  currentUser: CurrentUser
  allUsers: Profile[]
  activeOtherUserId: string | null
  onSelectUser: (user: Profile) => void
  onProfileUpdate: (updates: Partial<CurrentUser>) => void
  visible?: boolean
}

function matchesQuery(user: Profile, query: string) {
  const name = (user.full_name ?? user.email.split('@')[0]).toLowerCase()
  return name.includes(query) || user.email.toLowerCase().includes(query)
}

export default function Sidebar({
  currentUser,
  allUsers,
  activeOtherUserId,
  onSelectUser,
  onProfileUpdate,
  visible = true,
}: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)

  const filteredUsers = useMemo(() => {
    const trimmed = debouncedQuery.trim().toLowerCase()
    if (!trimmed) return allUsers
    return allUsers.filter((user) => matchesQuery(user, trimmed))
  }, [allUsers, debouncedQuery])

  return (
    <div
      className={`flex h-full w-full shrink-0 flex-col border-r border-wa-border bg-wa-panel md:w-[360px] md:min-w-[280px] md:max-w-[400px] ${
        visible ? 'flex' : 'hidden md:flex'
      }`}
    >
      <div className="flex h-[59px] shrink-0 items-center justify-between gap-2 border-b border-wa-divider bg-wa-panel2 px-3">
        <UserMenu currentUser={currentUser} onProfileUpdate={onProfileUpdate} />
      </div>

      <div className="shrink-0 px-3 py-2">
        <div className="flex h-9 min-h-9 items-center gap-2 rounded-lg bg-wa-input px-3">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-wa-text2"
            fill="currentColor"
            aria-hidden
          >
            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-wa-text outline-none placeholder:text-wa-text2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allUsers.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-wa-text2">No users yet</p>
            <p className="mt-1 text-xs text-wa-text2 opacity-60">
              Register with another account to start chatting
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-wa-text2">
              No matches for &ldquo;{debouncedQuery.trim()}&rdquo;
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const name = user.full_name ?? user.email.split('@')[0]
            const isOnline = isUserOnline(user.last_seen)
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
                <div className="relative shrink-0">
                  <Avatar name={name} url={user.avatar_url} size="md" />
                  {isOnline && (
                    <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-wa-panel bg-wa-green" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[15px] font-normal text-wa-text">
                      {name}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-xs ${isOnline ? 'text-wa-green' : 'text-wa-text2'}`}
                  >
                    {formatLastSeenSidebar(user.last_seen)}
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
