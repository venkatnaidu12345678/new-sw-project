import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api/client";
import { Alert, btnClass, inputClass } from "../components/ui/primitives";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminLogin(email, password);
      localStorage.setItem("adminToken", res.token);
      localStorage.setItem("admin", JSON.stringify(res.admin));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-[#0b1220] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent-violet/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_55%)]" />
      </div>

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-accent-violet p-10 text-white lg:flex">
          <div>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-extrabold backdrop-blur">
              SW
            </span>
            <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Share Wheels Admin</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-indigo-100">
              Manage users, rides, courier requests, ads, and legal policies from one modern console.
            </p>
          </div>
          <p className="text-xs text-indigo-200/80">Secure admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 lg:p-10">
          <div className="mb-6 lg:hidden">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-violet text-base font-extrabold text-white">
              SW
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to the admin panel.</p>

          {error ? <Alert className="mt-5">{error}</Alert> : null}

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                className={inputClass()}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                className={inputClass()}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="��������"
              />
            </label>

            <button type="submit" disabled={loading} className={`${btnClass("primary")} w-full py-3`}>
              {loading ? "Signing in�" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
