import test from "node:test";
import assert from "node:assert/strict";
import { proxyPreview } from "../middleware.js";

const host = "nexus-backend-l5cg-aaaaaaaaa-stanchinapietro-4789.vercel.app";
const request = new Request("https://frontend.example/api/health?q=test", { headers: {cookie:"nexus_session=test; other=private"} });
test("Preview only forwards the application session and server identity", async () => {
  const result = await proxyPreview(request, host, async () => "test-identity", async (url, init) => {
    assert.equal(url, "https://" + host + "/api/health?q=test");
    assert.equal(init.headers.get("cookie"), "nexus_session=test");
    assert.equal(init.headers.get("x-vercel-trusted-oidc-idp-token"), "test-identity");
    assert.equal(init.redirect, "manual");
    return Response.json({ status:"ok" }, {headers:{"set-cookie":"nexus_session=fresh; HttpOnly; Secure"}});
  });
  assert.deepEqual(await result.json(), {status:"ok"});
  assert.match(result.headers.get("set-cookie"), /HttpOnly/);
});
test("Declines other destinations, cross-origin writes and unexpected redirects", async () => {
  assert.equal((await proxyPreview(request, "example.com", () => assert.fail())).status, 503);
  const write = new Request(request.url,{method:"POST",headers:{origin:"https://other.example"}});
  assert.equal((await proxyPreview(write,host,() => assert.fail())).status,403);
  const result = await proxyPreview(request,host,async () => "test",async () => Response.redirect("https://example.com/sso"));
  assert.equal(result.status,502);
  assert.equal(result.headers.has("location"),false);
});
