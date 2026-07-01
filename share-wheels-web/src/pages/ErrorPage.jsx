import { useRouteError, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const message = error?.message || error?.statusText || "Something went wrong";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <img src="/logo-mark.png" alt="Share Wheels" className="mb-6 h-16 w-16 rounded-2xl" />
      <h1 className="text-2xl font-bold text-white">Page error</h1>
      <p className="mt-3 max-w-md text-slate-400">{String(message)}</p>
      <Link to="/" className="btn-glow mt-8 rounded-xl px-6 py-3 text-sm font-bold text-white">
        Back to home
      </Link>
    </div>
  );
}
