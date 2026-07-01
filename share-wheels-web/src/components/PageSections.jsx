import AppImage from "./AppImage";
import ScrollReveal from "./ScrollReveal";

export function PageHero({ eyebrow, title, subtitle, image, children, tall = true }) {
  return (
    <section
      className={`relative overflow-hidden ${tall ? "min-h-[72vh] sm:min-h-[78vh]" : "min-h-[50vh]"}`}
    >
      <AppImage
        src={image}
        alt=""
        eager
        className="absolute inset-0 h-full w-full object-cover opacity-35 animate-fade-in"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/75 to-slate-950" />
      <div className="relative flex h-full min-h-[inherit] items-end">
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <ScrollReveal variant="up">
            {eyebrow ? (
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">{eyebrow}</p>
            ) : null}
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">{subtitle}</p>
            ) : null}
            {children ? <div className="mt-10">{children}</div> : null}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export function CtaBanner({ title, text, to, label = "Learn more" }) {
  return (
    <ScrollReveal variant="scale">
      <div className="gradient-border p-8 sm:p-10">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="mt-3 text-base text-slate-400">{text}</p>
        <a href={to} className="mt-5 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200">
          {label} →
        </a>
      </div>
    </ScrollReveal>
  );
}

export function PageSection({ children, className = "", id }) {
  return (
    <section id={id} className={`section-xl ${className}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  );
}
