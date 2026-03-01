"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid password");
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          Admin Sign In
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 transition-colors focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-white bg-white py-2.5 text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
