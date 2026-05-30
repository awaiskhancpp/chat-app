/** Matches heartbeat interval in ChatLayout (~30s updates). */
export const ONLINE_THRESHOLD_SEC = 90

function secondsSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
}

export function isUserOnline(lastSeen: string): boolean {
  return secondsSince(lastSeen) < ONLINE_THRESHOLD_SEC
}

/** Chat header — WhatsApp-style presence text */
export function formatLastSeenHeader(lastSeen: string): string {
  const diff = secondsSince(lastSeen)
  if (diff < ONLINE_THRESHOLD_SEC) return 'online'

  const date = new Date(lastSeen)
  const now = new Date()
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (diff < 3600) {
    const mins = Math.floor(diff / 60)
    return mins <= 1 ? 'last seen just now' : `last seen ${mins} min ago`
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfSeen = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const daysDiff = Math.round(
    (startOfToday.getTime() - startOfSeen.getTime()) / 86400000
  )

  if (daysDiff === 0) return `last seen today at ${time}`
  if (daysDiff === 1) return `last seen yesterday at ${time}`
  if (daysDiff < 7) {
    const weekday = date.toLocaleDateString([], { weekday: 'long' })
    return `last seen ${weekday} at ${time}`
  }

  const datePart = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
  return `last seen ${datePart}`
}

/** Sidebar chat list — short label */
export function formatLastSeenSidebar(lastSeen: string): string {
  const diff = secondsSince(lastSeen)
  if (diff < ONLINE_THRESHOLD_SEC) return 'online'
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(lastSeen).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
