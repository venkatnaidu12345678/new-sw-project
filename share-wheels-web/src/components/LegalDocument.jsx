export function LegalSection({ title, children, id }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-white/5 py-10 last:border-b-0">
      <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-400">{children}</div>
    </section>
  );
}

export function LegalList({ items }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-blue-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function LegalDocument({ children, updatedAt }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-10">
      {updatedAt ? (
        <p className="mb-8 text-sm font-medium text-slate-500">Last updated: {updatedAt}</p>
      ) : null}
      {children}
    </article>
  );
}
