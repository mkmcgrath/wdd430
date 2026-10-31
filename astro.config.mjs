import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";

const apiPort = process.env.PORT ?? "8493";

export default defineConfig({
  output: "static",
  base: "/vault",
  integrations: [preact()],
  vite: {
    server: {
      // Astro strips the base path before the proxy runs, so add it back for the API.
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          rewrite: (path) => `/vault${path}`,
        },
      },
    },
  },
});
