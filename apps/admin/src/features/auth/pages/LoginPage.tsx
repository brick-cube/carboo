
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to sign in. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <Link to="/login" className="mb-14 inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5a1f] text-xl font-bold text-white">
              C
            </span>
            <span className="text-2xl font-bold tracking-tight text-zinc-950">
              carboo<span className="text-[#ff5a1f]">.</span>
            </span>
          </Link>

          <div className="mb-9">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ff5a1f]">
              Administration
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Sign in to manage your fleet, trips and bookings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-12 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#ff5a1f] focus:ring-2 focus:ring-[#ff5a1f]/10"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#f05a28] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-12 text-sm outline-none transition focus:border-[#ff5a1f] focus:ring-2 focus:ring-[#ff5a1f]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff5a1f] text-sm font-semibold text-white transition hover:bg-[#e94b14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to dashboard"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-zinc-400">
            Carboo Administration · Secure access
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#17191c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/[0.07]" />
        <div className="absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full border border-white/[0.07]" />

        <div className="relative z-10">
          <span className="text-sm font-semibold tracking-[0.25em] text-white/60">
            CARBOO / OPERATIONS
          </span>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 h-1 w-12 rounded-full bg-[#ff5a1f]" />
          <h2 className="text-5xl font-semibold leading-[1.15] tracking-tight">
            Every journey.
            <br />
            <span className="text-[#ff5a1f]">Under control.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/50">
            One place to manage your vehicles, coordinate trips and keep your
            transportation operations moving.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} Carboo. All rights reserved.
        </p>
      </section>
    </main>
  );
}