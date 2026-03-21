import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
};

/**
 * Reads the JWT directly from the cookie — works on Vercel without NEXTAUTH_URL.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = await getToken({
    req: req as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  if (!token?.id) return null;

  return {
    id: token.id as string,
    name: (token.name as string) ?? "",
    email: (token.email as string) ?? "",
    role: (token.role as string) ?? "member",
    color: (token.color as string) ?? "#3B82F6",
  };
}
