"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./chat.module.css";

interface MessageInputProps {
  onSend: (content: string, attachmentUrl?: string, attachmentName?: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if ((!trimmed && !file) || disabled) return;

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;

    if (file) {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user!.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file);

      if (!error) {
        const { data } = supabase.storage.from("attachments").getPublicUrl(path);
        attachmentUrl = data.publicUrl;
        attachmentName = file.name;
      }
      setUploading(false);
    }

    setValue("");
    setFile(null);
    await onSend(trimmed , attachmentUrl, attachmentName);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
    e.target.value = "";
  }

  const isImage = file?.type.startsWith("image/");

  return (
    <div className={styles.inputBar}>
      {file && (
        <div className={styles.filePreview}>
          {isImage ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className={styles.previewImg}
            />
          ) : (
            <span className={styles.fileIcon}>📎</span>
          )}
          <span className={styles.fileName}>{file.name}</span>
          <button className={styles.removeFile} onClick={() => setFile(null)}>✕</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <button
          type="button"
          className={styles.attachBtn}
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach file"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <textarea
          className={styles.textInput}
          placeholder="Type a message…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled || uploading}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={disabled || uploading || (!value.trim() && !file)}
          title="Send"
        >
          {uploading ? "⏳" : "↑"}
        </button>
      </form>
    </div>
  );
}