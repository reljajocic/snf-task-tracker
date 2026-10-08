import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { callerForToken } from "@/lib/mcp/auth";
import { buildServer } from "@/lib/mcp/tools";

// MCP endpoint for AI assistants: https://<app>/api/mcp/<personal key> (Settings → AI assistants).
// Stateless: every request builds a fresh server that acts as the key's owner.

export const maxDuration = 60;

async function handle(request: Request, ctx: RouteContext<"/api/mcp/[token]">) {
  const { token } = await ctx.params;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const caller = await callerForToken(bearer || token);
  if (!caller) {
    return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: "Unknown or revoked key. Make a new one in SNF Dailies → Settings." }, id: null }, { status: 401 });
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await buildServer(caller).connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
