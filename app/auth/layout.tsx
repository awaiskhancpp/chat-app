export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-wa-bg px-6">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(0,168,132,0.12),transparent)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
