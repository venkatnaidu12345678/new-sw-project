const EVENTS = [
  { text: "Car ride started · Madhapur → Kondapur", time: "now" },
  { text: "Auto · 2 seats booked · Quick Reserve", time: "14s" },
  { text: "Bike seat confirmed · pillion ride", time: "22s" },
  { text: "Parcel picked up · en route", time: "31s" },
  { text: "New auto commute published", time: "48s" },
  { text: "Live GPS · car, auto & bike active", time: "1m" },
  { text: "Passenger request matched", time: "2m" },
];

export default function LiveTicker() {
  const items = [...EVENTS, ...EVENTS];

  return (
    <div className="border-b border-indigo-500/20 bg-gradient-to-r from-indigo-950/80 via-slate-950/90 to-cyan-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="hidden shrink-0 items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:inline-flex">
          <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
          Live
        </span>
        <div className="ticker-mask min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-10">
            {items.map((item, i) => (
              <div key={`${item.text}-${i}`} className="flex shrink-0 items-center gap-2 text-sm text-slate-300">
                <span className="text-indigo-400">●</span>
                <span className="whitespace-nowrap">{item.text}</span>
                <span className="whitespace-nowrap text-xs text-indigo-400/70">· {item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
