export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-wa-bg">
      {children}
    </div>
  );
}
