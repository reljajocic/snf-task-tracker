import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Security headers on every response. No page may be framed (clickjacking: nobody can overlay our
// Approve / Issue buttons inside their own site), no MIME sniffing, links to other sites carry only our
// origin (portal and sign-up links hold secret tokens), and no plugins, base-tag or cross-site form tricks.
// A full script CSP is left out on purpose: Next's inline bootstrap and the theme script would need nonces.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    // Moodboard images (already downscaled in the browser); Vercel caps a request at 4.5 MB anyway.
    serverActions: { bodySizeLimit: "4mb" },
    // Going back to a screen seen in the last 30 s shows it at once instead of asking the server again.
    // Saving anything clears this (revalidatePath / router.refresh), and AutoRefresh keeps it current.
    staleTimes: { dynamic: 30 },
  },
};

export default withNextIntl(nextConfig);
