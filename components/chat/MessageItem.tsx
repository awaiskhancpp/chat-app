"use client";

import { useState } from "react";
import type { Message } from "@/types";
import styles from "./chat.module.css";

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isFirst: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageItem({ message, isOwn, isFirst, onEdit, onDelete }: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isDeleted = message.content === null && !message.attachment_url;
  const [hovered, setHovered] = useState(false);

  const displayName = message.user_name ?? message.user_email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();
  const wasEdited = message.updated_at !== message.created_at;

  async function handleSave() {
    if (!editValue.trim() || editValue.trim() === message.content) {
      setEditing(false);
      setEditValue(message.content);
      return;
    }
    setSaving(true);
    await onEdit(message.id, editValue.trim());
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(message.id);
    setDeleting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditValue(message.content);
    }
  }
  if (message.is_system) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        padding: "6px 0",
      }}>
        <span style={{
          fontSize: "12px",
          color: "var(--text-3)",
          background: "var(--bg-3)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "4px 14px",
          fontFamily: "var(--font-mono)",
        }}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    
    <div
      className={`${styles.messageRow} ${isOwn ? styles.ownRow : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
    >
      {!isOwn && (
        <div className={`${styles.avatarSmall} ${!isFirst ? styles.avatarHidden : ""}`}>
          {initials}
        </div>
      )}

      <div className={`${styles.messageBubbleWrap} ${isOwn ? styles.ownBubbleWrap : ""}`}>
        {isFirst && (
          <div className={`${styles.msgMeta} ${isOwn ? styles.ownMeta : ""}`}>
            <span className={styles.msgAuthor}>{isOwn ? "You" : displayName}</span>
            <span className={styles.msgTime}>{formatTime(message.created_at)}</span>
            {wasEdited && <span className={styles.editedTag}>edited</span>}
          </div>
        )}

        {isDeleted ? (
          <div style={{
            padding: "9px 14px",
            borderRadius: "16px",
            fontSize: "13px",
            fontStyle: "italic",
            color: "#888888",
          background: "transparent",
          border: "none",
          }}>
          This message was deleted.
        </div>
      ) :editing ? (
          <div className={styles.editWrap}>
            <textarea
              className={styles.editTextarea}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={2}
            />
            <div className={styles.editActions}>
              <button className={styles.editSave} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className={styles.editCancel} onClick={() => { setEditing(false); setEditValue(message.content); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
            {message.content}
            {message.attachment_url &&(
              <div className={styles.attachment}>
                {message.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ?(
                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" >
                    <img
                      src={message.attachment_url}
                      alt={message.attachment_name ?? "image"}
                      className={styles.attachmentImg}
                    />
                  </a>
                ): message.attachment_url.match(/\.(mp4|webm|ogg|mov)$/i)?(
                 <video
                    controls
                    className={styles.attachmentVideo}
                  >
                    <source src={message.attachment_url} />
                    Your browser does not support video.
                  </video>
                ) :message.attachment_url.match(/\.pdf$/i) ?(
                <a href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentFile}
                  >
                    📄 {message.attachment_name ?? "Download PDF"}
                  </a>
                ):(
                  <a href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentFile}
                  >
                    📎 {message.attachment_name ?? "Download file"}
                  </a>
                )}

                
              </div>
            )}
          </div>
        )}
      </div>

      {isOwn && hovered && !editing && (
        <div className={styles.msgActions}>
          <button
            className={styles.actionBtn}
            onClick={() => setEditing(true)}
            title="Edit"
          >✎</button>
          {confirmDelete ? (
            <>
              <button
                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                onClick={handleDelete}
                disabled={deleting}
                title="Confirm delete"
              >{deleting ? "…" : "✓"}</button>
              <button
                className={styles.actionBtn}
                onClick={() => setConfirmDelete(false)}
                title="Cancel"
              >✕</button>
            </>
          ) : (
            <button
              className={`${styles.actionBtn} ${styles.dangerBtn}`}
              onClick={() => setConfirmDelete(true)}
              title="Delete"
            >🗑</button>
          )}
        </div>
      )}
    </div>
  );
}
