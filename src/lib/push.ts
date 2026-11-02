import "server-only";
import webpush from "web-push";

// Web Push: notifications on phones (the app added to the home screen) and in browsers.
// Keys: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (see .env.example). Without them nothing is sent.

export type PushDevice = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured = false;
function ready() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:app@slatenframe.com", pub, priv);
    configured = true;
  }
  return true;
}

/** Sends to every device. Returns how many got it, and the devices the push service says are gone (to forget). */
export async function sendPush(devices: PushDevice[], msg: PushMessage): Promise<{ sent: number; gone: string[] }> {
  if (!devices.length) return { sent: 0, gone: [] };
  if (!ready()) {
    console.warn("[push] VAPID keys not set; skipped", msg.title);
    return { sent: 0, gone: [] };
  }
  const payload = JSON.stringify(msg);
  const results = await Promise.all(
    devices.map((d) =>
      webpush
        .sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 60 * 60 * 24 })
        .then(() => "sent" as const)
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) return "gone" as const;
          console.error("[push] send failed", e.statusCode ?? e);
          return "failed" as const;
        }),
    ),
  );
  return { sent: results.filter((r) => r === "sent").length, gone: devices.filter((_, i) => results[i] === "gone").map((d) => d.endpoint) };
}

/** Email lines are HTML; a notification shows plain text. */
export function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, c: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[c]!)
    .trim();
}
