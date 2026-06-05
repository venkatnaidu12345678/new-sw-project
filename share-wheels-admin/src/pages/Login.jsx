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
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-indigo-600 to-accent-violet px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.15),transparent_50%)]" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-violet text-lg font-extrabold text-white shadow-lg">
          SW
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Share Wheels Admin
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage users, rides, requests, and ads.
        </p>

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
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={loading} className={`${btnClass("primary")} w-full`}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
