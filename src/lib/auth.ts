import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        console.log("[auth] login attempt for:", email);
        if (!email || !password) { console.log("[auth] missing email or password"); return null; }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        console.log("[auth] ADMIN_EMAIL set:", !!adminEmail);
        console.log("[auth] ADMIN_PASSWORD_HASH set:", !!adminPasswordHash, "length:", adminPasswordHash?.length, "starts:", adminPasswordHash?.substring(0, 4));
        if (!adminEmail || !adminPasswordHash) { console.log("[auth] env vars missing"); return null; }
        if (email !== adminEmail) { console.log("[auth] email mismatch:", email, "vs", adminEmail); return null; }

        const isValid = await bcrypt.compare(password, adminPasswordHash);
        console.log("[auth] bcrypt.compare result:", isValid);
        if (!isValid) return null;

        return {
          id: "admin",
          email: adminEmail,
          name: "Admin",
        };
      },
    }),
  ],
});
