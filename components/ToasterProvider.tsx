"use client";

import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-wa-border bg-wa-panel text-wa-text shadow-lg",
          title: "text-wa-text font-medium",
          description: "text-wa-text2",
          success: "border-wa-green/40",
          error: "border-wa-danger/40",
        },
        duration:3000
      }}
    />
  );
}
