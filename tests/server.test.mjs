import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

process.env.NODE_ENV = "test";
const { resetTestState, server } = await import("../server.mjs");

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => resetTestState());

const baseUrl = () => `http://127.0.0.1:${server.address().port}`;

async function signIn(actorId) {
  const response = await fetch(`${baseUrl()}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ actorId }),
  });
  return { response, cookie: response.headers.get("set-cookie").split(";", 1)[0] };
}

test("serves the deterministic storefront", async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Orbit Supply/);
  assert.match(html, /상품 검색/);
  assert.match(html, /주문 확정/);
});

test("does not expose files outside the repository root", async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/..%2Fpackage.json`);
  assert.equal(response.status, 404);
});

test("permission session fixtures expose stable actor and role contracts", async () => {
  const viewer = await signIn("viewer");
  const manager = await signIn("manager");

  assert.match(viewer.cookie, /^orbit_session=/);
  assert.deepEqual(await viewer.response.json(), {
    actorId: "viewer",
    name: "QA 조회자",
    role: "viewer",
  });
  assert.match(manager.cookie, /^orbit_session=/);
  assert.deepEqual(await manager.response.json(), {
    actorId: "manager",
    name: "재고 관리자",
    role: "inventoryManager",
  });
});

test("viewer cannot change inventory visibility and no audit record is written", async () => {
  const { cookie } = await signIn("viewer");
  const denied = await fetch(`${baseUrl()}/api/inventory/visibility`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ productId: "halo-lamp", hidden: true }),
  });
  const inventory = await fetch(`${baseUrl()}/api/inventory`).then((response) => response.json());

  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { error: "재고 관리자 권한이 필요합니다." });
  assert.deepEqual(inventory, { hiddenProductIds: [], auditLog: [] });
});

test("inventory manager changes visibility and leaves an attributable audit record", async () => {
  const { cookie } = await signIn("manager");
  const allowed = await fetch(`${baseUrl()}/api/inventory/visibility`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ productId: "halo-lamp", hidden: true }),
  });
  const inventory = await fetch(`${baseUrl()}/api/inventory`).then((response) => response.json());

  assert.equal(allowed.status, 200);
  assert.deepEqual(inventory.hiddenProductIds, ["halo-lamp"]);
  assert.deepEqual(inventory.auditLog, [{ sequence: 1, actorId: "manager", action: "product.hidden", productId: "halo-lamp" }]);
});

test("forged role headers do not bypass the server-side session check", async () => {
  const response = await fetch(`${baseUrl()}/api/inventory/visibility`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-role": "inventoryManager" },
    body: JSON.stringify({ productId: "halo-lamp", hidden: true }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "테스트 사용자 세션이 필요합니다." });
});
