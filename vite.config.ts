import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: ["minitwo", "minitwo.tail591527.ts.net"],
    proxy: {
      "/money": {
        target: "http://localhost:58000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
      "/auth-token": {
        target: "http://localhost:58000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
      "/accounts": {
        target: "http://localhost:58000",
        changeOrigin: true,
        cookieDomainRewrite: "",
        bypass(req) {
          if (req.headers.accept?.includes("text/html")) return req.url;
        },
      },
      "/graphql": {
        target: "http://localhost:58000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
    },
  },
});
