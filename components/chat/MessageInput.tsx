"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onSend: (content: string, attachmentUrl?: string, attachmentName?: string) => Promise<void>;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
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
      const { error } = await supabase.storage.from("attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("attachments").getPublicUrl(path);
        attachmentUrl = data.publicUrl;
        attachmentName = file.name;
      }
      setUploading(false);
    }

    setValue("");
    setFile(null);
    await onSend(trimmed, attachmentUrl, attachmentName);
  }

  const isImage = file?.type.startsWith("image/");

  return (
    <div className="shrink-0 border-t border-wa-border bg-wa-panel2 px-4 py-3">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-wa-border bg-wa-panel px-3 py-2 text-sm text-wa-text2">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <span className="text-lg" aria-hidden>
              {'\u{1F4CE}'}
            </span>
          )}
          <span className="flex-1 truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="rounded px-1 text-wa-danger hover:underline"
            aria-label="Remove attachment"
          >
            X
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-wa-border bg-wa-panel text-lg text-wa-text2"
          aria-label="Attach file"
        >
          <span aria-hidden>{'\u{1F4CE}'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.webm,.ogg,.mov"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = "";
          }}
          className="hidden"
        />

        <textarea
          className="max-h-[120px] flex-1 resize-none rounded-full border border-wa-border bg-wa-panel px-4 py-2 text-sm text-wa-text outline-none"
          placeholder="Type a message..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          disabled={disabled || uploading}
        />

        <button
          type="submit"
          disabled={disabled || uploading || (!value.trim() && !file)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-wa-green to-[#1a9f88] text-lg font-semibold text-white transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          {uploading ? "..." : "\u2191"}
        </button>
      </form>
    </div>
  );
}
