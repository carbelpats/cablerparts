import { defineConfig } from "vitest/config";

// Vitest config — jsdom environment so the service layer's localStorage-backed
// LOCAL adapters work under Node, and `globals: true` so describe/it/expect are
// available without imports. The Grand Tour integration test exercises the real
// service functions end-to-end with NO Supabase env set (LOCAL adapter path).
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
