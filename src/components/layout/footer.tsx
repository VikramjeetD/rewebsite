import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-white">Brandy Culp Realty</h3>
            <p className="mt-2 text-sm text-white/60">
              Expert guidance for buying, selling, and renting in New York.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Quick Links</h4>
            <nav className="mt-2 flex flex-col gap-2">
              <Link
                href="/listings"
                className="text-sm text-white/60 hover:text-white"
              >
                Listings
              </Link>
              <Link
                href="/about"
                className="text-sm text-white/60 hover:text-white"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm text-white/60 hover:text-white"
              >
                Contact
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold text-white">Contact</h4>
            <div className="mt-2 space-y-1 text-sm text-white/60">
              <p>(830) 658-3246</p>
              <p>brandyculp@spiralny.com</p>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-8 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Brandy Culp Realty. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
