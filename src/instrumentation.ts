import type { Instrumentation } from "next";

// Server errors (pages, actions, route handlers) go to app_errors + an email to the admin.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  if (digest?.startsWith("NEXT_")) return; // redirects / not-found are control flow, not errors
  const { reportError } = await import("@/lib/errors");
  await reportError({
    source: "server",
    message: err instanceof Error ? err.message : String(err),
    digest,
    path: request.path,
    route: `${context.routeType} ${context.routePath}`,
  });
};
