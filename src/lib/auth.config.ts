import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js config that is safe for Edge Runtime (no bcryptjs).
 * Used by middleware. The full config with Credentials provider
 * is in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // Added in auth.ts — kept empty here for Edge compatibility
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isAdmin = nextUrl.pathname.startsWith("/admin");
      if (isAdmin) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
