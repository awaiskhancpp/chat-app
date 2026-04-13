export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px",
    }}>
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,106,245,0.15), transparent)",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}
