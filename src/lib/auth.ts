import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string;
        if (!password) return null;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        if (!adminEmail || !adminPasswordHash) return null;

        const isValid = await bcrypt.compare(password, adminPasswordHash);
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
