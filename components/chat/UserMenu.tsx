'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, uploadAvatar } from '@/lib/profile'
import Avatar from './Avatar'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
}

interface UserMenuProps {
  currentUser: CurrentUser
  onProfileUpdate: (updates: Partial<CurrentUser>) => void
}

function SettingsModal({
  currentUser,
  onClose,
  onSave,
}: {
  currentUser: CurrentUser
  onClose: () => void
  onSave: (updates: Partial<CurrentUser>) => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const displayName = currentUser.name ?? currentUser.email.split('@')[0]

  const [name, setName] = useState(displayName)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentUser.avatar_url
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }

    setSaving(true)
    try {
      let avatarUrl: string | undefined

      if (avatarFile) {
        avatarUrl = await uploadAvatar(supabase, currentUser.id, avatarFile)
      }

      await updateProfile(supabase, currentUser.id, {
        fullName: trimmed,
        ...(avatarUrl !== undefined && { avatarUrl }),
      })

      onSave({
        name: trimmed,
        ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
      })

      toast.success('Profile updated')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-wa-border bg-wa-panel p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 text-lg font-semibold text-wa-text">Settings</h2>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full border-0 bg-transparent p-0"
            >
              <Avatar name={name || displayName} url={avatarPreview} size="lg" />
              <div className='absolute bottom-2 right-2'>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xl font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                +
              </span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-wa-text2">Click photo to change</p>
          </div>

          <div>
            <label htmlFor="display-name" className="mb-1.5 block text-sm text-wa-text2">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-[10px] border border-wa-border bg-wa-input px-4 py-3 text-sm text-wa-text outline-none focus:border-wa-green"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-wa-border px-4 py-2.5 text-sm text-wa-text2 transition-colors hover:bg-wa-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-wa-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserMenu({ currentUser, onProfileUpdate }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()
  const menuRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const displayName = currentUser.name ?? currentUser.email.split('@')[0]

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={displayName} url={currentUser.avatar_url} size="sm" />
        <span className="min-w-0 truncate text-sm font-medium text-wa-text">
          {displayName}
        </span>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          title="Menu"
          className="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent text-xl text-wa-text2 transition-colors hover:bg-wa-hover"
        >
          <span className="block translate-y-[-2px] font-bold leading-none tracking-tighter">
            &middot;&middot;&middot;
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[110%] z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-wa-border bg-wa-panel2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true)
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-wa-text transition-colors hover:bg-wa-panel"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                handleLogout()
              }}
              className="flex w-full items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-wa-danger transition-colors hover:bg-wa-panel"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setSettingsOpen(false)}
          onSave={onProfileUpdate}
        />
      )}
    </>
  )
}
