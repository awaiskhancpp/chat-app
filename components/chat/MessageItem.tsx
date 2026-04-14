'use client'

import { useState } from 'react'
import type { Message } from '@/types'

interface Props {
  message: Message
  isOwn: boolean
  onEdit: (id: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SeenStatus({
  message,
  isOwnBubble,
}: {
  message: Message
  isOwnBubble: boolean
}) {
  const muted = isOwnBubble ? 'text-white/50' : 'text-wa-text2'
  if (message.seen_at)
    return (
      <span className="text-[0.7rem] text-wa-green" aria-label="Read">
        {'\u2713\u2713'}
      </span>
    )
  if (message.delivered_at)
    return (
      <span className={`text-[0.7rem] ${muted}`} aria-label="Delivered">
        {'\u2713\u2713'}
      </span>
    )
  return (
    <span className={`text-[0.7rem] opacity-60 ${muted}`} aria-label="Sent">
      {'\u2713'}
    </span>
  )
}

function IconPaperclip({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MessageItem({ message, isOwn, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isDeleted = !message.content && !message.attachment_url
  const wasEdited = message.is_edited

  if (message.is_system) {
    return (
      <div className="flex justify-center py-1.5">
        <span className="rounded-full bg-wa-panel px-3.5 py-1 text-xs text-wa-text2">
          {message.content}
        </span>
      </div>
    )
  }

  async function handleSave() {
    if (!editValue.trim() || editValue.trim() === message.content) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onEdit(message.id, editValue.trim())
    setSaving(false)
    setEditing(false)
  }

  const bubbleShell =
    'shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] animate-fade-in px-3.5 py-2 text-sm leading-relaxed'

  return (
    <div
      className={`group relative mb-0.5 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setConfirmDelete(false)
      }}
    >
      <div className="relative max-w-[min(75%,28rem)]">
        {isOwn && hovered && !editing && !isDeleted && (
          <div className="absolute right-full top-1/2 z-10 mr-1.5 hidden -translate-y-1/2 gap-1 group-hover:flex">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Edit"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-wa-border bg-wa-panel2 text-wa-text2"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => onDelete(message.id)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-wa-danger text-[0.7rem] font-bold text-white"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-wa-border bg-wa-panel2 text-[0.65rem] text-wa-text2"
                >
                  X
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-wa-border bg-wa-panel2 text-wa-danger"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        )}

        {isDeleted ? (
          <div
            className={`${bubbleShell} rounded-2xl border border-wa-border italic text-wa-text2 ${
              isOwn
                ? 'rounded-br-md bg-wa-bubble-out'
                : 'rounded-bl-md bg-wa-bubble-in'
            }`}
          >
            This message was deleted
          </div>
        ) : editing ? (
          <div className="flex min-w-[200px] flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-[10px] border border-wa-green bg-wa-panel2 px-3 py-2 text-sm text-wa-text outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer rounded-md border border-wa-border bg-wa-panel2 px-3 py-1 text-xs text-wa-text2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="cursor-pointer rounded-md bg-wa-green px-3 py-1 text-xs font-semibold text-white disabled:opacity-70"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`${bubbleShell} text-wa-text ${
              isOwn
                ? 'rounded-2xl rounded-br-md bg-wa-bubble-out'
                : 'rounded-2xl rounded-bl-md border border-wa-border/40 bg-wa-bubble-in'
            }`}
          >
            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {message.attachment_url && (
              <div className={message.content ? 'mt-2' : ''}>
                {/\.(jpg|jpeg|png|gif|webp)$/i.test(message.attachment_url) ? (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.attachment_url}
                      alt={message.attachment_name ?? 'image'}
                      className="block max-h-[180px] max-w-[220px] rounded-lg"
                    />
                  </a>
                ) : /\.(mp4|webm|ogg|mov)$/i.test(message.attachment_url) ? (
                  <video controls className="block max-w-[280px] rounded-lg">
                    <source src={message.attachment_url} />
                  </video>
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[0.8125rem] text-wa-text no-underline"
                  >
                    <IconPaperclip className="h-4 w-4 shrink-0 opacity-80" />
                    {message.attachment_name ?? 'Download file'}
                  </a>
                )}
              </div>
            )}

            <div className="mt-1 flex items-center justify-end gap-1">
              {wasEdited && (
                <span
                  className={`text-[0.65rem] italic ${
                    isOwn ? 'text-white/45' : 'text-wa-text2'
                  }`}
                >
                  edited
                </span>
              )}
              <span
                className={`text-[0.6875rem] ${
                  isOwn ? 'text-white/50' : 'text-wa-text2'
                }`}
              >
                {formatTime(message.created_at)}
              </span>
              {isOwn && <SeenStatus message={message} isOwnBubble={isOwn} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
