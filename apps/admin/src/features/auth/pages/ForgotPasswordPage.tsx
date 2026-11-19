
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Connect this to a password-recovery API when that endpoint exists.
    setSubmitted(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-5 py-12">
      <div className="w-full max-w-[430px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
        <Link to="/login" className="mb-10 inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5a1f] font-bold text-white">
            C
          </span>
          <span className="text-xl font-bold tracking-tight text-zinc-950">
            carboo<span className="text-[#ff5a1f]">.</span>
          </span>
        </Link>

        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#ff5a1f]">
          <Mail className="h-5 w-5" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Enter your administrator email address to begin the password
          recovery process.
        </p>

        {submitted ? (
          <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            The recovery screen is ready, but password recovery is not
            connected yet. Please contact the system administrator to reset
            your password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="h-12 w-full rounded-lg border border-zinc-200 px-4 text-sm outline-none transition focus:border-[#ff5a1f] focus:ring-2 focus:ring-[#ff5a1f]/10"
              />
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ff5a1f] text-sm font-semibold text-white transition hover:bg-[#e94b14]"
            >
              Continue <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </main>
  );
}