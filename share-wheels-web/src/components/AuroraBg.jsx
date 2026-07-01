export default function AuroraBg({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className="aurora-orb -left-32 top-0 h-96 w-96 bg-blue-500/35"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="aurora-orb right-0 top-1/4 h-80 w-80 bg-blue-300/20"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="aurora-orb bottom-0 left-1/3 h-72 w-72 bg-green-500/12"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="aurora-orb -right-20 bottom-1/4 h-64 w-64 bg-yellow-400/12"
        style={{ animationDelay: "-2s" }}
      />
    </div>
  );
}
