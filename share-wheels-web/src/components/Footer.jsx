import { NavLink } from "react-router-dom";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "../data/contact";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/drivers", label: "Drivers" },
  { to: "/download", label: "Download" },
];

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/5 bg-slate-950/80 py-12 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="Share Wheels" className="h-11 w-11 rounded-xl" />
          <div>
            <p className="font-extrabold text-white">Share Wheels</p>
            <p className="text-sm text-slate-500">Car · Auto · Bike — ride together. Pay less.</p>
            <a
              href={CONTACT_MAILTO}
              className="mt-1 inline-block text-sm font-medium text-blue-300 hover:text-blue-200"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <nav className="flex flex-wrap gap-6">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className="text-sm font-medium text-slate-400 hover:text-blue-300"
            >
              {l.label}
            </NavLink>
          ))}
          {LEGAL_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-slate-400 hover:text-blue-300"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-4 text-center text-sm text-slate-600 sm:px-6">
        © {year} Share Wheels. All rights reserved.
      </p>
    </footer>
  );
}
