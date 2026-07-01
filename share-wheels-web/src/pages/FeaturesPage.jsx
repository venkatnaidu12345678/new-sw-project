import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import AppImage from "../components/AppImage";
import LiveTrackingSection from "../components/LiveTrackingSection";
import VehicleTypesSection from "../components/VehicleTypesSection";
import ScrollReveal from "../components/ScrollReveal";
import { IMAGES, MAP_GALLERY } from "../data/images";

const FEATURES = [
  {
    image: IMAGES.mapNavigation,
    title: "Live ride map",
    description: "See nearby rides, ETAs, and segment fares before you book — then track GPS live.",
    span: "lg:col-span-2 lg:row-span-2",
    tall: true,
  },
  {
    image: IMAGES.carInterior,
    title: "Smart ride sharing",
    description: "Book car, auto, or bike seats with upfront segment pricing.",
  },
  {
    image: IMAGES.delivery,
    title: "Courier on route",
    description: "Send parcels on trips drivers already take.",
  },
  {
    image: IMAGES.friendsRide,
    title: "Passenger requests",
    description: "Post your route — matching drivers find you.",
  },
  {
    image: IMAGES.community,
    title: "Verified community",
    description: "Profiles, history, and in-app chat.",
  },
  {
    image: IMAGES.highway,
    title: "Driver publish",
    description: "Car, auto, or bike — routes, stopovers & Quick Reserve.",
    span: "lg:col-span-2",
    wide: true,
  },
  {
    image: IMAGES.autoRide,
    title: "Auto rides",
    description: "Shared auto-rickshaw routes with live GPS and split fares.",
  },
  {
    image: IMAGES.bikeRide,
    title: "Bike rides",
    description: "Motorcycle & scooter seats — one passenger per trip.",
  },
];

const DEEP_DIVE = [
  {
    title: "Segment pricing",
    desc: "Pay only for the distance between your pickup and drop — not the driver's full route.",
    image: IMAGES.urbanCommute,
  },
  {
    title: "Quick Reserve",
    desc: "Instant booking when a ride has open seats — no waiting for driver approval.",
    image: IMAGES.whiteCar,
  },
  {
    title: "In-app chat",
    desc: "Coordinate pickup points with drivers and co-passengers before and during the ride.",
    image: IMAGES.friendsRide,
  },
];

export default function FeaturesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Features"
        title="Everything for shared mobility"
        subtitle="Car, auto, and bike rides — plus courier, live tracking, and fair split fares for everyday commutes."
        image={IMAGES.mapAerial}
      />

      <PageSection>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Core features</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            Built for passengers, drivers & senders
          </h2>
        </ScrollReveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} variant="scale" delay={i * 70} className={f.span || ""}>
              <article className="gradient-border h-full overflow-hidden">
                <div
                  className={`relative flex h-full flex-col ${f.tall ? "min-h-[440px]" : f.wide ? "min-h-[220px]" : "min-h-[240px]"}`}
                >
                  {f.tall ? (
                    <>
                      <AppImage
                        src={f.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-55"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                      <span className="map-ring absolute right-8 top-8 h-10 w-10 rounded-full border-2 border-cyan-400/60" />
                    </>
                  ) : (
                    <div className="relative h-44 overflow-hidden">
                      <AppImage src={f.image} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    </div>
                  )}
                  <div className="relative mt-auto p-6">
                    <h3 className="text-lg font-bold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <VehicleTypesSection compact />

      <LiveTrackingSection showCta={false} />

      <PageSection className="section-glow border-y border-white/5">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <ScrollReveal variant="left">
            <AppImage src={IMAGES.smartphone} alt="Mobile app" className="w-full rounded-2xl object-cover shadow-2xl" />
          </ScrollReveal>
          <ScrollReveal variant="right" delay={120}>
            <h2 className="text-3xl font-extrabold text-white">Built mobile-first</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Search routes, book seats, track live GPS, and manage courier deliveries from one app — with
              notifications at every step.
            </p>
            <ul className="mt-8 space-y-4 text-base text-slate-300">
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span> Segment-based pricing — pay only for your distance
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span> Quick Reserve instant booking
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span> Real-time driver location on the map
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span> In-app chat with drivers & co-passengers
              </li>
            </ul>
            <Link to="/download" className="btn-glow mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-bold text-white">
              Download the app
            </Link>
          </ScrollReveal>
        </div>
      </PageSection>

      <PageSection>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold text-white">Map views in the app</h2>
          <p className="mt-4 text-slate-400">Every role sees the same live tracking experience.</p>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {MAP_GALLERY.map((item, i) => (
            <ScrollReveal key={item.title} variant={i % 2 ? "right" : "left"} delay={i * 80}>
              <article className="group overflow-hidden rounded-2xl border border-white/10">
                <AppImage
                  src={item.src}
                  alt={item.title}
                  className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="p-5">
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.caption}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <PageSection className="pb-24">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold text-white">Go deeper</h2>
        </ScrollReveal>
        <div className="mt-14 space-y-20">
          {DEEP_DIVE.map((item, i) => (
            <div
              key={item.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[direction:rtl]" : ""}`}
            >
              <ScrollReveal variant={i % 2 ? "right" : "left"} className="lg:[direction:ltr]">
                <AppImage src={item.image} alt={item.title} className="rounded-2xl object-cover shadow-xl" />
              </ScrollReveal>
              <ScrollReveal variant={i % 2 ? "left" : "right"} delay={100} className="lg:[direction:ltr]">
                <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                <p className="mt-4 text-lg text-slate-400">{item.desc}</p>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </PageSection>
    </main>
  );
}
