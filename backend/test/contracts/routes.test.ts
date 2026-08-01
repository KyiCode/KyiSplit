import { describe, expect, it } from "vitest"

import expenseRouter from "../../src/routes/expenseRoutes"
import groupRouter from "../../src/routes/groupRoutes"
import userRouter from "../../src/routes/userRoutes"
import { API_ENDPOINTS } from "../../src/contracts/api"

interface RouteLayer {
    route?: {
        path: string
        methods: Record<string, boolean>
    }
}

function routerEndpoints(
    prefix: string,
    router: { stack: unknown[] }
) {
    return (router.stack as RouteLayer[]).flatMap(layer => {
        if (!layer.route) return []
        return Object.entries(layer.route.methods)
            .filter(([, enabled]) => enabled)
            .map(([method]) => ({
                method: method.toUpperCase(),
                path: `${prefix}${layer.route!.path}`
            }))
    })
}

describe("API route inventory", () => {
    it("documents every mounted endpoint", () => {
        const mounted = [
            ...routerEndpoints("/api/users", userRouter),
            ...routerEndpoints("/api/groups", groupRouter),
            ...routerEndpoints("/api/expenses", expenseRouter)
        ].sort((left, right) => (
            `${left.method} ${left.path}`.localeCompare(
                `${right.method} ${right.path}`
            )
        ))
        const documented = API_ENDPOINTS
            .filter(endpoint => endpoint.state === "active")
            .map(({ method, path }) => ({ method, path }))
            .sort((left, right) => (
                `${left.method} ${left.path}`.localeCompare(
                    `${right.method} ${right.path}`
                )
            ))

        expect(mounted).toEqual(documented)
        expect(documented).toEqual(expect.arrayContaining([
            {
                method: "GET",
                path: "/api/groups/:groupId/repayments"
            },
            {
                method: "POST",
                path: "/api/groups/:groupId/repayments"
            },
            {
                method: "DELETE",
                path: "/api/groups/:groupId/repayments/:repaymentId"
            },
            {
                method: "DELETE",
                path: "/api/expenses/:groupId/:expenseId"
            }
        ]))
    })
})
