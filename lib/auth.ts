import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data, error } = await supabase
          .from("User")
          .select("*")
          .eq("email", credentials.email as string)
          .single();

        if (error || !data) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          data.password
        );
        if (!valid) return null;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          color: data.color,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.color = (user as { color: string }).color;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { color: string }).color = token.color as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
