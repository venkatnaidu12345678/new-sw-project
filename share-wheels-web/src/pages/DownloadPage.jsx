import { Link } from "react-router-dom";
import { PageHero, PageSection } from "../components/PageSections";
import AppImage from "../components/AppImage";
import AuroraBg from "../components/AuroraBg";
import LiveTrackingSection from "../components/LiveTrackingSection";
import VehicleTypesSection from "../components/VehicleTypesSection";
import ScrollReveal from "../components/ScrollReveal";
import { IMAGES, GALLERY } from "../data/images";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "../data/contact";

const APP_FEATURES = [
  { title: "Live GPS map", desc: "Track car, auto, and bike rides from booking to drop-off.", image: IMAGES.mapPhone },
  { title: "Book any vehicle", desc: "Search and filter by car, auto, or bike.", image: IMAGES.smartphone },
  { title: "Send parcels", desc: "Courier on shared trips with live tracking.", image: IMAGES.delivery },
  { title: "Driver hub", desc: "Publish car, auto, or bike routes.", image: IMAGES.mapApp },
];

export default function DownloadPage() {
  return (
    <main>
      <PageHero
        eyebrow="Download"
        title="Get Share Wheels on your phone"
        subtitle="Book car, auto, or bike rides, publish trips, send parcels, and track everything live — free to download."
        image={IMAGES.mapPhone}
      />

      <PageSection>
        <ScrollReveal variant="scale">
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-300/20 p-8 sm:p-14">
            <AuroraBg />
            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-4">
                  <img src="/logo-mark.png" alt="Share Wheels logo" className="h-20 w-20 rounded-2xl shadow-xl" />
                  <div>
                    <p className="text-2xl font-extrabold text-white">Share Wheels</p>
                    <p className="text-slate-400">Ride together. Pay less.</p>
                  </div>
                </div>
                <p className="mt-6 text-lg leading-relaxed text-slate-400">
                  Available for Android and iOS. Store links will be published soon —{" "}
                  <a href={CONTACT_MAILTO} className="font-semibold text-blue-300 hover:text-blue-200">
                    email us
                  </a>{" "}
                  for beta access.
                </p>
                <a
                  href={CONTACT_MAILTO}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  <span aria-hidden>✉</span>
                  {CONTACT_EMAIL}
                </a>
                <p className="mt-3 text-sm text-slate-500">
                  <Link to="/privacy" className="font-semibold text-blue-300 hover:text-blue-200">
                    Privacy Policy
                  </Link>
                  {" · "}Required for Google Play and App Store publishing.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold text-slate-900 transition hover:bg-slate-100"
                  >
                    Google Play — soon
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/20 px-6 py-4 font-bold text-white hover:bg-white/5"
                  >
                    App Store — soon
                  </a>
                </div>
              </div>
              <div className="relative">
                <AppImage
                  src={IMAGES.mapLiveWide}
                  alt="Share Wheels live map on mobile"
                  className="mx-auto max-h-96 w-full rounded-2xl object-cover shadow-2xl"
                />
                <span className="map-ring absolute left-1/2 top-1/3 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-blue-300/70" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </PageSection>

      <PageSection className="section-glow border-y border-white/5">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold text-white">Everything in one app</h2>
        </ScrollReveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {APP_FEATURES.map((item, i) => (
            <ScrollReveal key={item.title} variant="up" delay={i * 90}>
              <article className="gradient-border h-full overflow-hidden">
                <AppImage src={item.image} alt={item.title} className="aspect-square w-full object-cover" />
                <div className="p-5">
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </PageSection>

      <VehicleTypesSection compact />

      <LiveTrackingSection showGallery={false} />

      <PageSection className="pb-24">
        <ScrollReveal className="text-center">
          <h2 className="text-3xl font-extrabold text-white">What you'll get</h2>
          <p className="mt-4 text-slate-400">Real rides, real savings, real-time maps.</p>
        </ScrollReveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((item, i) => (
            <ScrollReveal key={item.title} variant="scale" delay={i * 70}>
              <article className="group overflow-hidden rounded-2xl border border-white/10">
                <AppImage
                  src={item.src}
                  alt={item.title}
                  className="aspect-video w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="p-5">
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.caption}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal className="mt-16 text-center">
          <Link to="/features" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
            Explore all features →
          </Link>
        </ScrollReveal>
      </PageSection>
    </main>
  );
}
