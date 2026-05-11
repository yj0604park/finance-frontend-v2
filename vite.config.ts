import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { UserConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  } satisfies UserConfig["test"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
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
      },
      "/graphql": {
        target: "http://localhost:58000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
    },
  },
});
