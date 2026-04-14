"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./chat.module.css";

interface ChatHeaderProps {
  currentUser: { id: string; email: string; name: string | null };
  onVideoCall: () => void;
  onAudioCall: () => void;
  onlineUsers: number;
}

export default function ChatHeader({ currentUser, onVideoCall, onAudioCall, onlineUsers }: ChatHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const displayName = currentUser.name ?? currentUser.email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerLogo}>⌁</div>
        <div>
          <h1 className={styles.headerTitle}>ChatApp</h1>
          <span className={styles.onlineBadge}>
            <span className={styles.onlineDot} />
            {onlineUsers > 0 ? `${onlineUsers + 1} online` : "Live"}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userEmail}>{currentUser.email}</span>
        </div>
        {onlineUsers > 0 && (
          <>
            <button className={styles.callHeaderBtn} onClick={onAudioCall} title="Audio call">🎙️</button>
            <button className={styles.callHeaderBtn} onClick={onVideoCall} title="Video call">📹</button>
          </>
        )}
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
        >
          {loggingOut ? "..." : "↪"}
        </button>
      </div>
    </header>
  );
}