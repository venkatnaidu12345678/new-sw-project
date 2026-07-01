import { Link } from "react-router-dom";
import AppImage from "./AppImage";
import ScrollReveal from "./ScrollReveal";
import { IMAGES, MAP_GALLERY, TRACKING_FEATURES } from "../data/images";

const MARKERS = [
  { left: "28%", top: "42%", delay: "0s" },
  { left: "52%", top: "55%", delay: "1.2s" },
  { left: "68%", top: "38%", delay: "2.1s" },
];

export default function LiveTrackingSection({ showGallery = true, showCta = true }) {
  return (
    <section id="live-tracking" className="section-glow border-y border-white/5 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">Live tracking</p>
          <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Follow every ride on the <span className="gradient-text">map</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Share Wheels streams driver GPS to passengers and senders in real time — for car, auto, and bike
            rides from booking confirmation until drop-off or delivery.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="scale" delay={120} className="relative mt-14 lg:mt-20">
          <div className="absolute -inset-4 rounded-[2rem] bg-cyan-500/10 blur-3xl animate-glow-pulse" />
          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-cyan-400/25 shadow-2xl shadow-cyan-950/40 sm:min-h-[520px] lg:min-h-[680px]">
            <AppImage
              src={IMAGES.mapLiveWide}
              alt="Live tracking map"
              eager
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent" />

            {MARKERS.map((m) => (
              <span
                key={`${m.left}-${m.top}`}
                className="map-ring absolute h-14 w-14 rounded-full border-2 border-cyan-400/80"
                style={{ left: m.left, top: m.top, animationDelay: m.delay }}
              />
            ))}

            <div className="absolute left-[28%] top-[42%] flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <span className="live-dot h-3 w-3 rounded-full bg-emerald-400" />
            </div>

            <div className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 lg:right-auto lg:w-[420px]">
              <div className="glass-card animate-slide-up rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">Live now</p>
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-2 text-lg font-bold text-white">Madhapur → Kondapur</p>
                <p className="mt-1 text-sm text-slate-400">Driver en route · ETA 8 min · 3 passengers</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[68%] animate-progress rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" />
                </div>
              </div>
            </div>

            <div className="absolute right-6 top-6 hidden rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-md sm:block">
              GPS active
            </div>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKING_FEATURES.map((item, i) => (
            <ScrollReveal key={item.title} variant="up" delay={i * 90} className="gradient-border p-6">
              <p className="font-bold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </ScrollReveal>
          ))}
        </div>

        {showGallery ? (
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {MAP_GALLERY.map((item, i) => (
              <ScrollReveal key={item.title} variant={i % 2 ? "right" : "left"} delay={i * 80}>
                <article className="group overflow-hidden rounded-2xl border border-white/10">
                  <AppImage
                    src={item.src}
                    alt={item.title}
                    className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="border-t border-white/5 p-4">
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.caption}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        ) : null}

        {showCta ? (
          <ScrollReveal className="mt-16 text-center">
            <Link
              to="/how-it-works"
              className="btn-glow inline-flex rounded-2xl px-8 py-3.5 text-sm font-bold text-white"
            >
              See how tracking works
            </Link>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}
