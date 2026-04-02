import { loadEnvConfig } from "@next/env";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

loadEnvConfig(process.cwd());

const strictCoverage = process.env.STRICT_COVERAGE === "true";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
      thresholds: strictCoverage
        ? {
            lines: 80,
            functions: 80,
            statements: 80,
            branches: 70,
          }
        : undefined,
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/__tests__/unit/**/*.test.ts"],
          setupFiles: ["./src/__tests__/setup/shared.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: [
            "src/__tests__/component/**/*.test.tsx",
            "src/__tests__/component/**/*.test.ts",
          ],
          setupFiles: ["./src/__tests__/setup/component.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/__tests__/integration/**/*.test.ts"],
          setupFiles: ["./src/__tests__/setup/integration.ts"],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
