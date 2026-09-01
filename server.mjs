import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const root = new URL(".", import.meta.url).pathname;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
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

