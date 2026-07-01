import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import AppImage from "../components/AppImage";
import LiveTrackingSection from "../components/LiveTrackingSection";
import ScrollReveal from "../components/ScrollReveal";
import { IMAGES } from "../data/images";

const BLOCKS = [
  {
    title: "Passengers",
    accent: "from-blue-500 to-blue-700",
    image: IMAGES.passengerHappy,
    steps: [
      { n: "01", t: "Search route", d: "Enter from, to & date — browse rides or post a request." },
      { n: "02", t: "Book a seat", d: "See segment fare upfront · Quick Reserve or send request." },
      { n: "03", t: "Track live", d: "Follow GPS on the map until you arrive." },
    ],
  },
  {
    title: "Courier senders",
    accent: "from-amber-300 to-amber-500",
    image: IMAGES.packages,
    steps: [
      { n: "01", t: "Find a route", d: "Pick a ride heading near your parcel destination." },
      { n: "02", t: "Add parcel details", d: "Receiver info, photo, and your offer amount." },
      { n: "03", t: "Track delivery", d: "Same live map as the ride — end to end." },
    ],
  },
  {
    title: "Drivers",
    accent: "from-green-500 to-green-700",
    image: IMAGES.steeringWheel,
    steps: [
      { n: "01", t: "Publish your route", d: "Choose car, auto, or bike — set stops, seats, and courier capacity." },
      { n: "02", t: "Accept bookings", d: "Passengers and senders join from the app." },
      { n: "03", t: "Share live GPS", d: "Start the ride — everyone tracks you on the map." },
    ],
  },
];

const TIMELINE = [
  { time: "Before ride", label: "Book & confirm", desc: "Seat or parcel confirmed · pickup details shared" },
  { time: "Ride starts", label: "GPS goes live", desc: "Driver location appears on the map for all participants" },
  { time: "En route", label: "ETA updates", desc: "Route progress and arrival time refresh automatically" },
  { time: "Drop-off", label: "Ride complete", desc: "Status updates · fare settled · history saved" },
];

const FAQ = [
  { q: "Which vehicles are supported?", a: "Car, auto (auto-rickshaw), and bike (motorcycle/scooter) — filter by type when you search." },
  { q: "Do I need to refresh the map?", a: "No — location updates stream automatically while the ride is active." },
  { q: "Can senders track parcels?", a: "Yes. Courier senders see the same live map as passengers." },
  { q: "When does tracking start?", a: "When the driver starts the ride from their dashboard." },
];

export default function HowItWorksPage() {
  return (
    <main>
      <PageHero
        eyebrow="How it works"
        title="Three steps to your ride"
        subtitle="Whether you're booking a car, auto, or bike seat — or sending a parcel — Share Wheels keeps the flow simple and transparent."
        image={IMAGES.mapCityNight}
      />

      <PageSection>
        <div className="space-y-24">
          {BLOCKS.map((block, bi) => (
            <div
              key={block.title}
              className={`grid items-center gap-12 lg:grid-cols-2 ${bi % 2 ? "lg:[direction:rtl]" : ""}`}
            >
              <ScrollReveal variant={bi % 2 ? "right" : "left"} className="lg:[direction:ltr]">
                <div className="relative overflow-hidden rounded-3xl border border-white/10">
                  <AppImage src={block.image} alt={block.title} className="aspect-[4/3] w-full object-cover" />
                  {block.title === "Passengers" ? (
                    <span className="map-ring absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-300/70" />
                  ) : null}
                </div>
              </ScrollReveal>
              <ScrollReveal variant={bi % 2 ? "left" : "right"} delay={120} className="lg:[direction:ltr]">
                <div className="gradient-border p-8 sm:p-10">
                  <span
                    className={`inline-flex rounded-full bg-gradient-to-r ${block.accent} px-4 py-1 text-xs font-bold uppercase tracking-wider text-white`}
                  >
                    {block.title}
                  </span>
                  <ol className="mt-8 space-y-8">
                    {block.steps.map((s, si) => (
                      <li key={s.n} className="flex gap-5">
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${block.accent} text-sm font-bold text-white`}
                        >
                          {s.n}
                        </span>
                        <div>
                          <p className="text-lg font-bold text-white">{s.t}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </PageSection>

      <LiveTrackingSection showGallery={false} />

      <PageSection className="section-glow border-y border-white/5">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Tracking timeline</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white">What happens on the map</h2>
        </ScrollReveal>
        <div className="relative mt-16">
          <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-blue-300/50 via-blue-500/30 to-transparent sm:left-1/2 sm:block" />
          <div className="space-y-12">
            {TIMELINE.map((step, i) => (
              <ScrollReveal
                key={step.label}
                variant={i % 2 ? "right" : "left"}
                delay={i * 80}
                className={`relative sm:w-1/2 ${i % 2 ? "sm:ml-auto sm:pl-12" : "sm:pr-12 sm:text-right"}`}
              >
                <div className="gradient-border p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-300">{step.time}</p>
                  <p className="mt-2 text-xl font-bold text-white">{step.label}</p>
                  <p className="mt-2 text-sm text-slate-400">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid gap-10 lg:grid-cols-2">
          <ScrollReveal variant="scale">
            <div className="relative min-h-[360px] overflow-hidden rounded-3xl border border-blue-300/20">
              <AppImage src={IMAGES.mapTracking} alt="Live tracking map" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <span className="map-ring absolute left-[40%] top-[45%] h-14 w-14 rounded-full border-2 border-green-400/80" />
              <div className="absolute bottom-6 left-6 right-6 glass-card rounded-2xl p-5">
                <p className="font-bold text-white">Unified map for all roles</p>
                <p className="mt-1 text-sm text-slate-400">Drivers, passengers, and senders — one live view.</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="right" delay={120}>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Live tracking FAQ</h2>
            <dl className="mt-8 space-y-6">
              {FAQ.map((item) => (
                <div key={item.q} className="border-b border-white/5 pb-6">
                  <dt className="font-bold text-white">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
                </div>
              ))}
            </dl>
            <Link to="/download" className="btn-glow mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white">
              Get the app
            </Link>
          </ScrollReveal>
        </div>
      </PageSection>
    </main>
  );
}
