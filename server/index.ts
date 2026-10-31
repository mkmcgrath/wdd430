import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { app } from "./app";

const port = Number(process.env.PORT ?? 8493);

const root = new Hono();

// Production serves dist/ through Caddy. SERVE_STATIC runs the built site from
// this process so `npm run preview` behaves like the deployed app.
if (process.env.SERVE_STATIC) {
  root.get("/", (c) => c.redirect("/vault/"));
  root.get("/vault", (c) => c.redirect("/vault/"));
  root.route("/", app);
  root.use(
    "/vault/*",
    serveStatic({ root: "dist", rewriteRequestPath: (path) => path.replace(/^\/vault/, "") }),
  );
  root.notFound((c) => c.html(readFileSync("dist/404.html", "utf8"), 404));
} else {
  root.route("/", app);
}

serve({ fetch: root.fetch, hostname: "127.0.0.1", port }, ({ port: listening }) => {
  console.log(`API listening on http://127.0.0.1:${listening}`);
});
