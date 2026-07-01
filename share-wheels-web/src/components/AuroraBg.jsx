export default function AuroraBg({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className="aurora-orb -left-32 top-0 h-96 w-96 bg-indigo-600/40"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="aurora-orb right-0 top-1/4 h-80 w-80 bg-cyan-500/25"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="aurora-orb bottom-0 left-1/3 h-72 w-72 bg-violet-600/30"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="aurora-orb -right-20 bottom-1/4 h-64 w-64 bg-rose-500/15"
        style={{ animationDelay: "-2s" }}
      />
    </div>
  );
}
