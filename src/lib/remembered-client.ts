import "server-only";
import { cookies } from "next/headers";

// The content pages (shoots, schedule, video bank) are usually worked through for one client at
// a time, so the client picked on one is remembered (cookie, set in the browser) for the others.
export const CLIENT_COOKIE = "snf-client";

export async function rememberedClient(): Promise<string | null> {
  return (await cookies()).get(CLIENT_COOKIE)?.value ?? null;
}
