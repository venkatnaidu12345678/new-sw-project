import { useEffect, useState } from "react";
import useInView from "../hooks/useInView";

const STATS = [
  { label: "Active rides now", value: 128, suffix: "+" },
  { label: "Seats shared today", value: 940, suffix: "+" },
  { label: "Parcels in transit", value: 56, suffix: "" },
  { label: "Cities connected", value: 12, suffix: "+" },
];

function Counter({ target, active, suffix }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1500, 1);
      setCount(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);
  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}

export default function LiveStats() {
  const [ref, visible] = useInView({ threshold: 0.15 });

  return (
    <section ref={ref} className="relative py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`reveal gradient-border p-5 ${visible ? "reveal-visible" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <p className="text-3xl font-extrabold tabular-nums gradient-text">
              <Counter target={stat.value} active={visible} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
