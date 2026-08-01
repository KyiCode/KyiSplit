import { describe, expect, it } from "vitest"
import router from "../../src/routes/expenseRoutes"

interface RouteLayer {
    route?: {
        path: string
        methods: Record<string, boolean>
    }
}

describe("expense routes", () => {
    it("does not expose standalone payer or split mutation", () => {
        const paths = (router.stack as RouteLayer[])
            .map(layer => layer.route?.path)
            .filter(Boolean)

        expect(paths).not.toContain("/addpayer")
        expect(paths).not.toContain("/addsplit")
    })

    it("exposes one group-scoped delete route and no update route", () => {
        const routes = (router.stack as RouteLayer[])
            .filter(layer => layer.route)
            .flatMap(layer => Object.entries(layer.route!.methods)
                .filter(([, enabled]) => enabled)
                .map(([method]) => ({
                    method: method.toUpperCase(),
                    path: layer.route!.path
                }))
            )

        expect(routes).toContainEqual({
            method: "DELETE",
            path: "/:groupId/:expenseId"
        })
        expect(routes.filter(route => route.method === "DELETE"))
            .toHaveLength(1)
        expect(routes.some(route => (
            route.method === "PUT" || route.method === "PATCH"
        ))).toBe(false)
    })
})
