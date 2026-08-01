import { describe, expect, it } from "vitest"
import router from "../../src/routes/groupRoutes"

interface RouteLayer {
    route?: {
        path: string
    }
}

describe("group routes", () => {
    it("does not expose direct member insertion", () => {
        const paths = (router.stack as RouteLayer[])
            .map(layer => layer.route?.path)
            .filter(Boolean)

        expect(paths).not.toContain("/addmember")
    })
})
