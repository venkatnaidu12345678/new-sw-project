import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import AppImage from "../components/AppImage";
import LiveTrackingSection from "../components/LiveTrackingSection";
import VehicleTypesSection from "../components/VehicleTypesSection";
import ScrollReveal from "../components/ScrollReveal";
import { IMAGES } from "../data/images";

const PERKS = [
  "Publish car, auto, or bike rides with route, stops, and vehicle type",
  "Accept passengers and courier requests from one hub",
  "Live GPS sharing for every vehicle type — car, auto, and bike",
  "Driver subscription plans with flexible billing",
  "Complete rides when everyone is dropped — earnings update instantly",
];

const WORKFLOW = [
  { step: "1", title: "Publish route", desc: "Set your daily commute with seats and optional courier capacity.", image: IMAGES.highway },
  { step: "2", title: "Accept riders", desc: "Review passenger requests or enable Quick Reserve for instant bookings.", image: IMAGES.carInterior },
  { step: "3", title: "Start & track", desc: "Begin the ride — GPS shares live to everyone on the map.", image: IMAGES.mapApp },
  { step: "4", title: "Complete & earn", desc: "Mark drop-offs done. Fares and subscription usage update automatically.", image: IMAGES.electricCar },
];

export default function DriversPage() {
  return (
    <main>
      <PageHero
        eyebrow="For drivers"
        title="Turn empty seats into income"
        subtitle="Share Wheels helps you fill seats on trips you already take — in your car, auto, or on your bike — with tools to manage passengers, couriers, and live tracking."
        image={IMAGES.steeringWheel}
      >
        <Link to="/download" className="btn-glow inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white">
          Start driving
        </Link>
      </PageHero>

      <PageSection>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <ScrollReveal variant="left">
            <h2 className="text-3xl font-extrabold text-white">Driver tools that work</h2>
            <ul className="mt-8 space-y-5">
              {PERKS.map((text, i) => (
                <li key={text} className="flex gap-4 text-base text-slate-300">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-400">
                    ✓
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal variant="right" delay={120}>
            <div className="relative overflow-hidden rounded-3xl border border-violet-400/20">
              <AppImage src={IMAGES.mapNavigation} alt="Driver navigation map" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <span className="map-ring absolute left-[55%] top-[40%] h-12 w-12 rounded-full border-2 border-cyan-400/70" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="glass-card rounded-2xl p-5 animate-slide-up">
                  <div className="flex items-center gap-4">
                    <AppImage src={IMAGES.driverPortrait} alt="" className="h-14 w-14 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-white">Driver dashboard</p>
                      <p className="text-sm text-slate-400">Start · track · complete rides</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    {[
                      { l: "Status", v: "Live", dot: true },
                      { l: "Seats", v: "3/4" },
                      { l: "Courier", v: "1" },
                    ].map((r) => (
                      <div key={r.l} className="rounded-xl bg-white/5 py-2">
                        <p className="text-[10px] uppercase text-slate-500">{r.l}</p>
                        <p className="flex items-center justify-center gap-1 font-bold text-white">
                          {r.dot ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
                          {r.v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </PageSection>

      <VehicleTypesSection compact />

      <LiveTrackingSection showCta={false} />

      <PageSection className="section-glow border-y border-white/5">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold text-white">Your daily workflow</h2>
          <p className="mt-4 text-slate-400">From publish to payout — four steps on the road.</p>
        </ScrollReveal>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW.map((item, i) => (
            <ScrollReveal key={item.title} variant="up" delay={i * 90}>
              <article className="gradient-border h-full overflow-hidden">
                <AppImage src={item.image} alt={item.title} className="aspect-video w-full object-cover" />
                <div className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Step {item.step}</span>
                  <h3 className="mt-2 font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <PageSection className="pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { img: IMAGES.highway, t: "Car routes", d: "Inter-city commutes with stopovers and multiple seats." },
            { img: IMAGES.autoRide, t: "Auto routes", d: "Short city hops in shared auto-rickshaws." },
            { img: IMAGES.bikeRide, t: "Bike routes", d: "Quick motorcycle & scooter rides — one passenger." },
          ].map((card, i) => (
            <ScrollReveal key={card.t} variant="scale" delay={i * 80}>
              <article className="overflow-hidden rounded-2xl border border-white/10">
                <AppImage src={card.img} alt={card.t} className="aspect-video w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-bold text-white">{card.t}</h3>
                  <p className="mt-2 text-sm text-slate-500">{card.d}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>
    </main>
  );
}
