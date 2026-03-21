"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-blue-600 p-3 rounded-2xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">KAS Family Tracker</h1>
          <p className="text-gray-400 text-sm text-center">
            Sign in to access your family dashboard or tracker
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4"
        >
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400 font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-400 font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
