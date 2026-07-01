import { Link } from "react-router-dom";
import AuroraBg from "../components/AuroraBg";
import AppImage from "../components/AppImage";
import LiveTicker from "../components/LiveTicker";
import LiveStats from "../components/LiveStats";
import LiveTrackingSection from "../components/LiveTrackingSection";
import VehicleTypesSection from "../components/VehicleTypesSection";
import ScrollReveal from "../components/ScrollReveal";
import { PageSection } from "../components/PageSections";
import { IMAGES, GALLERY } from "../data/images";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "../data/contact";

const HIGHLIGHTS = [
  {
    title: "Split fares fairly",
    text: "Segment-based pricing means you only pay for the distance you travel — not the full route.",
    image: IMAGES.carInterior,
  },
  {
    title: "Courier on shared trips",
    text: "Send parcels on rides drivers already take. Same live map, same transparent pricing.",
    image: IMAGES.delivery,
  },
  {
    title: "Verified community",
    text: "Profiles, ride history, and in-app chat keep every trip accountable and safe.",
    image: IMAGES.community,
  },
];

const TESTIMONIALS = [
  { quote: "I save ₹800 every week on my office commute — and I can see exactly where my driver is.", name: "Priya S.", role: "Passenger" },
  { quote: "Publishing my morning route takes two minutes. Empty seats finally pay for fuel.", name: "Rahul M.", role: "Driver" },
  { quote: "Sent a parcel to my cousin on a shared ride. Tracked it live until delivery.", name: "Ananya K.", role: "Courier sender" },
];

export default function HomePage() {
  return (
    <>
      <LiveTicker />

      <section className="relative min-h-[85vh] overflow-hidden pb-20 pt-8">
        <AuroraBg />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:min-h-[75vh] lg:grid-cols-2 lg:py-12">
          <ScrollReveal variant="left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5">
              <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">
                Car · Auto · Bike · Courier
              </span>
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              <span className="gradient-text">Ride together.</span>
              <br />
              <span className="gradient-text-warm">Pay less.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Share rides in a car, auto, or on a bike. Send parcels on shared trips and split every fare
              with live GPS tracking from pickup to drop-off.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/download" className="btn-glow rounded-2xl px-7 py-3.5 text-sm font-bold text-white">
                Get the app
              </Link>
              <Link
                to="/features"
                className="rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Explore features
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[IMAGES.avatar1, IMAGES.avatar2, IMAGES.avatar3].map((src, i) => (
                  <AppImage
                    key={i}
                    src={src}
                    alt=""
                    className="h-11 w-11 rounded-full border-2 border-slate-900 object-cover"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-400">
                <span className="font-bold text-white">2,400+</span> active riders this week
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="right" delay={150}>
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-indigo-500/20 blur-3xl animate-glow-pulse" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                <AppImage
                  src={IMAGES.mapLiveWide}
                  alt="Live tracking map on mobile"
                  eager
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <span className="map-ring absolute left-[45%] top-[38%] h-12 w-12 rounded-full border-2 border-cyan-400/70" />
                <div className="absolute bottom-4 left-4 right-4 glass-card rounded-2xl p-4 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <AppImage src={IMAGES.mapPhone} alt="GPS map on phone" className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-white">
                        Live GPS tracking
                        <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
                      </p>
                      <p className="text-xs text-slate-400">Driver en route · ETA 8 min · 3 passengers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <LiveStats />

      <VehicleTypesSection />

      <LiveTrackingSection />

      <PageSection className="section-glow border-y border-white/5">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400">Why Share Wheels</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            More than a ride — a smarter commute
          </h2>
        </ScrollReveal>
        <div className="mt-16 space-y-24">
          {HIGHLIGHTS.map((item, i) => (
            <div
              key={item.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[direction:rtl]" : ""}`}
            >
              <ScrollReveal variant={i % 2 ? "right" : "left"} className="lg:[direction:ltr]">
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <AppImage src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                </div>
              </ScrollReveal>
              <ScrollReveal variant={i % 2 ? "left" : "right"} delay={100} className="lg:[direction:ltr]">
                <h3 className="text-2xl font-bold text-white sm:text-3xl">{item.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-400">{item.text}</p>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <ScrollReveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400">Gallery</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Share Wheels in action</h2>
          </div>
          <Link to="/features" className="text-sm font-semibold text-indigo-300 hover:text-white">
            All features →
          </Link>
        </ScrollReveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((item, i) => (
            <ScrollReveal key={item.title} variant="scale" delay={i * 80}>
              <article className="group h-full overflow-hidden rounded-2xl border border-white/10">
                <AppImage
                  src={item.src}
                  alt={item.title}
                  className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="border-t border-white/5 bg-slate-950/80 p-5">
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.caption}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <PageSection className="border-t border-white/5">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">Community</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white">Trusted by riders & drivers</h2>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} variant="up" delay={i * 100} className="gradient-border p-8">
              <p className="text-lg leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 border-t border-white/5 pt-4">
                <p className="font-bold text-white">{t.name}</p>
                <p className="text-sm text-slate-500">{t.role}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <PageSection className="pb-24">
        <ScrollReveal className="mb-10 text-center">
          <p className="text-sm text-slate-500">Questions or beta access?</p>
          <a
            href={CONTACT_MAILTO}
            className="mt-2 inline-block text-lg font-semibold text-indigo-300 hover:text-white"
          >
            {CONTACT_EMAIL}
          </a>
        </ScrollReveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { title: "How it works", text: "Book, ride, and track in three steps.", to: "/how-it-works" },
            { title: "For drivers", text: "Monetize empty seats on routes you already drive.", to: "/drivers" },
            { title: "Download", text: "Get Share Wheels on iOS or Android.", to: "/download" },
          ].map((card, i) => (
            <ScrollReveal key={card.to} variant="up" delay={i * 90}>
              <Link
                to={card.to}
                className="gradient-border block h-full p-8 transition duration-300 hover:-translate-y-1"
              >
                <h3 className="text-xl font-bold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{card.text}</p>
                <span className="mt-5 inline-block text-sm font-semibold text-indigo-300">Read more →</span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>
    </>
  );
}
