import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--primary)]">404</h1>
        <p className="mt-4 text-gray-600">Page not found.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--primary)] px-6 py-3 text-white hover:opacity-90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
