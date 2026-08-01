import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        clearMocks: true,
        environment: "node",
        include: ["test/**/*.test.ts"],
        exclude: ["test/**/*.db.test.ts"]
    }
})
