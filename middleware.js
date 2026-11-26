import { getVercelOidcToken } from "@vercel/oidc";

export const config = { runtime: "nodejs", matcher: "/api/:path*" };

function failure(status, detail) {
  return Response.json({ detail }, { status, headers: { "cache-control": "private, no-store" } });
}

// Use an immutable backend deployment from this project and team. Branch aliases can move.
export async function proxyPreview(request, host, tokenForRequest, send = fetch) {
  if (!/^nexus-backend-l5cg-[a-z0-9]{9}-stanchinapietro-4789\.vercel\.app$/.test(host ?? "")) {
    return failure(503, "Backend Preview da configurare.");
  }
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith("/api/")) return failure(404, "Percorso sconosciuto.");
  const read = ["GET", "HEAD"].includes(request.method);
  const origin = request.headers.get("origin");
  if (!read && origin && origin !== incoming.origin) return failure(403, "Origine non consentita.");
  try {
    const headers = new Headers();
    const token = await tokenForRequest();
    if (!token) return failure(503, "Identità Preview indisponibile.");
    headers.set("x-vercel-trusted-oidc-idp-token", token);
    for (const name of ["content-type", "accept", "x-nexus-revision"]) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    const session = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("nexus_session="));
    if (session) headers.set("cookie", session);
    const response = await send("https://" + host + incoming.pathname + incoming.search, {
      method: request.method, headers, redirect: "manual", cache: "no-store",
      body: read ? undefined : await request.arrayBuffer(), signal: AbortSignal.timeout(45000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = new URL(response.headers.get("location") ?? "/", "https://" + host);
      const login = incoming.pathname === "/api/ticktick/login" && location.origin === "https://ticktick.com" && location.pathname === "/oauth/authorize";
      const callback = incoming.pathname === "/api/ticktick/callback" && location.origin === incoming.origin && location.pathname === "/tasks";
      if (login || callback) return Response.redirect(location, 303);
      const sso = location.origin === "https://vercel.com" && location.pathname === "/sso-api";
      // Redirects can contain signed URLs. Record only the classification and upstream status.
      console.warn("NEXUS Preview upstream redirect", { status: response.status, vercelSSO: sso });
      const result = failure(502, sso ? "Verifica la relazione Trusted Sources tra i due progetti Preview." : "Redirect inatteso dal backend Preview.");
      result.headers.set("x-nexus-upstream-status", String(response.status));
      result.headers.set("x-nexus-upstream-redirect", sso ? "vercel-sso" : "unexpected");
      return result;
    }
    const outgoing = new Headers({ "cache-control": "private, no-store" });
    for (const name of ["content-type", "x-nexus-revision", "retry-after"]) {
      if (response.headers.has(name)) outgoing.set(name, response.headers.get(name));
    }
    for (const cookie of response.headers.getSetCookie()) {
      if (cookie.startsWith("nexus_session=")) outgoing.append("set-cookie", cookie);
    }
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return failure(502, "Connessione protetta al backend Preview indisponibile.");
  }
}

export default function middleware(request) {
  if (process.env.VERCEL_ENV === "preview") {
    return proxyPreview(request, process.env.NEXUS_PREVIEW_BACKEND_HOST, getVercelOidcToken);
  }
  // Other environments continue through their existing Vercel routing.
}
