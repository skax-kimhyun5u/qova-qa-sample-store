import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { extname, join, normalize } from "node:path";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const root = new URL(".", import.meta.url).pathname;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const actors = new Map([
  ["viewer", { name: "QA 조회자", role: "viewer" }],
  ["manager", { name: "재고 관리자", role: "inventoryManager" }],
]);
const productIds = new Set(["focus-notebook", "orbit-tray", "halo-lamp", "daily-cards", "cable-dock", "beam-light"]);
const sessions = new Map();
const hiddenProductIds = new Set();
const auditLog = [];

function json(response, status, payload, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw new Error("request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sessionFor(request) {
  const cookie = request.headers.cookie ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("orbit_session="))?.slice("orbit_session=".length);
  return token ? sessions.get(token) : undefined;
}

async function handleApi(request, response, pathname) {
  if (request.method === "POST" && pathname === "/api/session") {
    const body = await readJson(request);
    const actor = actors.get(body.actorId);
    if (!actor) return json(response, 422, { error: "알 수 없는 테스트 사용자입니다." });
    const token = randomUUID();
    sessions.set(token, { actorId: body.actorId, ...actor });
    return json(response, 200, { actorId: body.actorId, ...actor }, {
      "set-cookie": `orbit_session=${token}; HttpOnly; SameSite=Strict; Path=/`,
    });
  }

  if (request.method === "GET" && pathname === "/api/inventory") {
    return json(response, 200, { hiddenProductIds: [...hiddenProductIds], auditLog: [...auditLog] });
  }

  if (request.method === "POST" && pathname === "/api/inventory/visibility") {
    const session = sessionFor(request);
    if (!session) return json(response, 401, { error: "테스트 사용자 세션이 필요합니다." });
    if (session.role !== "inventoryManager") {
      return json(response, 403, { error: "재고 관리자 권한이 필요합니다." });
    }
    const body = await readJson(request);
    if (!productIds.has(body.productId) || typeof body.hidden !== "boolean") {
      return json(response, 422, { error: "유효한 상품과 공개 상태가 필요합니다." });
    }
    if (body.hidden) hiddenProductIds.add(body.productId);
    else hiddenProductIds.delete(body.productId);
    const audit = {
      sequence: auditLog.length + 1,
      actorId: session.actorId,
      action: body.hidden ? "product.hidden" : "product.visible",
      productId: body.productId,
    };
    auditLog.push(audit);
    return json(response, 200, { hiddenProductIds: [...hiddenProductIds], audit });
  }

  return json(response, 404, { error: "API route not found" });
}

export function resetTestState() {
  sessions.clear();
  hiddenProductIds.clear();
  auditLog.length = 0;
}

export const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(request, response, pathname);
    } catch {
      json(response, 400, { error: "요청 본문을 읽을 수 없습니다." });
    }
    return;
  }
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(root, safePath);

  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, host, () => {
    console.log(`QOVA QA Sample Store: http://${host}:${port}`);
  });
}
