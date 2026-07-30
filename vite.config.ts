import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/word-runner-web/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
