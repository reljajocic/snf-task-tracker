/**
 * A link someone typed (Drive folder, PDF, reference, cut) made safe to put in an href: web and mail links only,
 * a bare "drive.google.com/…" gets https://, and anything else (javascript:, data:, …) is dropped.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  const v = url?.trim();
  if (!v) return undefined;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    return ["https:", "http:", "mailto:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}
