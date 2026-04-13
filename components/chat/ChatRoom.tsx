"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";
import styles from "./chat.module.css";
import { useWebRTC } from "./useWebRTC";
import CallModal from "./callModal";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

interface ChatRoomProps {
  initialMessages: Message[];
  currentUser: CurrentUser;
}

export default function ChatRoom({ initialMessages, currentUser }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
    
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === (payload.new as Message).id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);
  const {
    callState, callType, incomingCall, remoteStream, localStream,
    isMuted, isCamOff, onlineUsers,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCam,
  } = useWebRTC(currentUser, async (summary: string) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: summary,
        is_system: true,
      }),
    });
  });

  async function handleSend(content: string, attachmentUrl?: string, attachmentName?: string) {
  setSending(true);
  try {
    const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachment_url: attachmentUrl, attachment_name: attachmentName }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Send error:", err);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleEdit(id: string, content: string) {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Edit error:", err);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      console.error("Delete error:", err);
    }
  }

  return (
    <div className={styles.room}>
      <ChatHeader
        currentUser={currentUser}
        onVideoCall={() => startCall("video")}
        onAudioCall={() => startCall("audio")}
        onlineUsers={onlineUsers}
      />
       {callState !== "idle" && (
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

      <div className={styles.messageList}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⌁</span>
            <p>No messages yet. Say something!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === currentUser.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isFirst={i === 0 || messages[i - 1].user_id !== msg.user_id}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
