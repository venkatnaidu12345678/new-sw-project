import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

/** Copy index.html → 404.html so hosts that serve a custom 404 page still load the SPA shell. */
function spaFallback404() {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback404()],
  server: {
    port: 5174,
  },
});
