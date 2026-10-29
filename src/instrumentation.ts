import type { Instrumentation } from "next";

// Server errors (pages, actions, route handlers) go to app_errors + an email to the admin.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  if (digest?.startsWith("NEXT_")) return; // redirects / not-found are control flow, not errors
  // The browser left before the page finished streaming (clicked elsewhere, closed the tab): nothing broke.
  const message = err instanceof Error ? err.message : String(err);
  if (/destination stream closed early|^aborted$/i.test(message)) return;
  const { reportError } = await import("@/lib/errors");
  await reportError({
    source: "server",
    message,
    digest,
    path: request.path,
    route: `${context.routeType} ${context.routePath}`,
  });
};
