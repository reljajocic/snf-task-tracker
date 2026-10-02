// Bootstrap helper: invite someone (e.g. the first admin) before anyone can use the Team screen.
//   node --env-file=.env.local scripts/invite-user.mjs --email admin@slatenframe.com --name "Relja (admin)" --initials A --role admin
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    initials: { type: "string" },
    bg: { type: "string", default: "#F4A98D" },
    fg: { type: "string", default: "#2F2D2E" },
    role: { type: "string", default: "user" },
    site: { type: "string", default: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000" },
  },
});

if (!values.email || !values.name) {
  console.error("Usage: --email <email> --name <full name> [--initials R] [--role admin|user] [--bg #hex --fg #hex]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.inviteUserByEmail(values.email, {
  data: {
    full_name: values.name,
    initials: values.initials ?? values.name.charAt(0).toUpperCase(),
    avatar_bg: values.bg,
    avatar_fg: values.fg,
    role: values.role === "admin" ? "admin" : "user",
  },
  redirectTo: `${values.site}/auth/confirm`,
});

if (error) {
  console.error("Invite failed:", error.message);
  process.exit(1);
}
console.log(`Invited ${data.user.email} (${values.role}). They'll get an email with a sign-in link.`);
