import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/drivers", label: "Drivers" },
  { to: "/download", label: "Download" },
];

const linkClass = ({ isActive }) =>
  [
    "text-sm font-medium transition",
    isActive ? "text-blue-300" : "text-slate-400 hover:text-blue-300",
  ].join(" ");

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location?.pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/5 bg-slate-950/85 shadow-lg shadow-black/20 backdrop-blur-2xl"
          : "bg-slate-950/50 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-blue-500/35 blur-md" />
            <img src="/logo-mark.png" alt="Share Wheels" className="relative h-10 w-10 rounded-xl" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">Share Wheels</span>
        </NavLink>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NavLink to="/download" className="btn-glow hidden rounded-xl px-4 py-2 text-sm font-bold text-white sm:inline-flex">
            Get the app
          </NavLink>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/5 bg-slate-950/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-blue-500/15 text-blue-200" : "text-slate-300 hover:text-blue-300"}`
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
