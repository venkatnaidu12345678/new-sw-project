import AppImage from "./AppImage";
import ScrollReveal from "./ScrollReveal";
import { VEHICLE_TYPES } from "../data/images";

export default function VehicleTypesSection({ compact = false }) {
  return (
    <section id="vehicle-types" className="section-glow border-y border-white/5 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">Vehicle types</p>
          <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Car, auto & <span className="gradient-text">bike</span> — your choice
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Share Wheels supports three vehicle types. Pick the ride that fits your route, budget, and
            how many seats you need — all with live GPS tracking.
          </p>
        </ScrollReveal>

        <div className={`mt-14 grid gap-6 ${compact ? "md:grid-cols-3" : "lg:grid-cols-3"}`}>
          {VEHICLE_TYPES.map((v, i) => (
            <ScrollReveal key={v.id} variant="up" delay={i * 100}>
              <article
                className={`group flex h-full flex-col overflow-hidden rounded-[1.75rem] border ${v.border} bg-slate-950/50 transition duration-300 hover:-translate-y-1`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <AppImage
                    src={v.image}
                    alt={`${v.label} ride on Share Wheels`}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <span
                    className={`absolute left-4 top-4 rounded-full bg-gradient-to-r ${v.accent} px-3 py-1 text-xs font-bold uppercase tracking-wider text-white`}
                  >
                    {v.label}
                  </span>
                  <span className="absolute bottom-4 right-4 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                    {v.seats}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{v.tagline}</p>
                  <h3 className="mt-2 text-xl font-bold text-white">{v.label} rides</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{v.desc}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
