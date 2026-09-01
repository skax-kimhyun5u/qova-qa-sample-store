import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.NODE_ENV = "test";
const { server } = await import("../server.mjs");

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

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

