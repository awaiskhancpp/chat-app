import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileUpdate {
  fullName?: string
  avatarUrl?: string | null
}

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('attachments').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  { fullName, avatarUrl }: ProfileUpdate
) {
  const profileUpdates: Record<string, string | null> = {}
  const metadataUpdates: Record<string, string | null> = {}

  if (fullName !== undefined) {
    const trimmed = fullName.trim()
    profileUpdates.full_name = trimmed
    metadataUpdates.full_name = trimmed
  }

  if (avatarUrl !== undefined) {
    profileUpdates.avatar_url = avatarUrl
    metadataUpdates.avatar_url = avatarUrl
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .upsert(profileUpdates)
      .eq('id', userId)

    if (error) {
      console.log(error)
      throw error
    }
  }

  if (Object.keys(metadataUpdates).length > 0) {
    const { error } = await supabase.auth.updateUser({ data: metadataUpdates })
    if (error) throw error
  }
}
