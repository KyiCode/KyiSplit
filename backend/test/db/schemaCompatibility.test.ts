import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
    assertSchemaCompatibility,
    findSchemaCompatibilityIssues,
    parseExplicitDatabaseUrl,
    readSchemaRequirements,
    type SchemaMetadata
} from "../../src/db/schemaCompatibility"

const referenceSql = readFileSync(
    path.resolve(__dirname, "../../../roadmap/schema-reference.sql"),
    "utf8"
)
const requirements = readSchemaRequirements(referenceSql)
const catalogFixture = JSON.parse(readFileSync(
    path.resolve(__dirname, "../fixtures/postgres17-schema-reference-catalog.json"),
    "utf8"
)) as Record<string, unknown[]>

function createCatalogClient(rowsByQuery = structuredClone(catalogFixture)) {
    return {
        async query<Row>(sql: string) {
            const name = sql.includes("format_type") ? "columns"
                : sql.includes("pg_get_constraintdef") ? "constraints"
                : sql.includes("pg_get_indexdef") ? "indexes"
                : sql.includes("tgtype") ? "triggers"
                : sql.includes("prosrc") ? "functions"
                : "unknown"
            return { rows: rowsByQuery[name] as Row[] }
        }
    }
}

function matchingMetadata(): SchemaMetadata {
    return {
        columns: requirements.columns.map(column => ({ ...column })),
        constraints: requirements.constraints.map(constraint => ({
            ...constraint,
            columns: [...constraint.columns],
            referencedColumns: constraint.referencedColumns
                ? [...constraint.referencedColumns]
                : undefined
        })),
        indexes: requirements.indexes.map(index => ({ ...index })),
        triggers: requirements.triggers.map(trigger => ({
            ...trigger,
            events: [...trigger.events],
            enabled: true
        })),
        functions: requirements.functions.map(fn => ({ ...fn }))
    }
}

describe("schema compatibility metadata", () => {
    it("reads the invariants from the schema reference", () => {
        expect(requirements.columns).toContainEqual({
            tableName: "expenses",
            columnName: "total",
            type: "kyisplit_money",
            nullable: false
        })
        expect(requirements.constraints).toContainEqual(expect.objectContaining({
            objectName: "users",
            kind: "unique",
            columns: ["email"]
        }))
        expect(requirements.constraints).toContainEqual(expect.objectContaining({
            objectName: "payments",
            kind: "foreign",
            columns: ["group_id", "user_id"],
            referencedSchema: "public",
            referencedTable: "group_members",
            referencedColumns: ["group_id", "user_id"],
            deleteAction: "RESTRICT"
        }))
        expect(requirements.triggers).toHaveLength(6)
        expect(requirements.functions.map(fn => fn.name)).toEqual([
            "kyisplit_assert_expense_balanced",
            "kyisplit_protect_expense_fx",
            "kyisplit_assert_expense_has_fx"
        ])
    })

    it("accepts metadata matching the schema reference", () => {
        expect(findSchemaCompatibilityIssues(
            requirements,
            matchingMetadata()
        )).toEqual([])
    })

    it("compares check expressions independent of PostgreSQL's added casts", () => {
        const metadata = matchingMetadata()
        const totalCheck = metadata.constraints.find(constraint => (
            constraint.objectName === "expenses" &&
            constraint.expression === "total > 0"
        ))!
        totalCheck.expression = "(total > (0)::numeric)"

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toEqual([])
    })

    it("rejects changed check operators and range boundaries", () => {
        const metadata = matchingMetadata()
        const totalCheck = metadata.constraints.find(constraint => (
            constraint.objectName === "expenses" &&
            constraint.expression === "total > 0"
        ))!
        totalCheck.expression = "total >= 0"

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing check constraint on public.expenses for total > 0."
        )

        totalCheck.expression = "total > -1"
        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing check constraint on public.expenses for total > 0."
        )
    })

    it("preserves NOT in IS NOT check expressions", () => {
        const customRequirements = {
            ...requirements,
            constraints: [{
                objectName: "checks",
                kind: "check" as const,
                columns: [],
                expression: "value IS NULL"
            }]
        }
        const metadata = matchingMetadata()
        metadata.constraints = [{
            objectName: "checks",
            kind: "check",
            columns: [],
            expression: "value IS NOT NULL"
        }]

        expect(findSchemaCompatibilityIssues(
            customRequirements,
            metadata
        )).toContain("Missing check constraint on public.checks for value IS NULL.")
    })

    it("reports a missing required column", () => {
        const metadata = matchingMetadata()
        metadata.columns = metadata.columns.filter(column => (
            column.tableName !== "expenses" || column.columnName !== "total"
        ))

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing column public.expenses.total."
        )
    })

    it("reports a wrong column type or nullability", () => {
        const metadata = matchingMetadata()
        const total = metadata.columns.find(column => (
            column.tableName === "expenses" && column.columnName === "total"
        ))!
        total.type = "numeric"

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Column public.expenses.total must use domain public.kyisplit_money."
        )
        total.nullable = true
        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Column public.expenses.total must be NOT NULL."
        )
    })

    it("reports removed checks and foreign keys by their meaning", () => {
        const metadata = matchingMetadata()
        metadata.constraints = metadata.constraints.filter(constraint => (
            constraint.objectName !== "expenses" ||
            constraint.expression !== "total > 0"
        ))

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing check constraint on public.expenses for total > 0."
        )
    })

    it("checks inline primary and unique keys", () => {
        const metadata = matchingMetadata()
        metadata.constraints = metadata.constraints.filter(constraint => (
            constraint.objectName !== "invites" ||
            constraint.kind !== "unique" ||
            constraint.columns[0] !== "token"
        ))

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing unique key on public.invites (token)."
        )
    })

    it("checks explicit expression and ordering indexes", () => {
        const metadata = matchingMetadata()
        metadata.indexes = metadata.indexes.filter(index => (
            index.tableName !== "users"
        ))

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Missing unique index on public.users for lower(email)."
        )
    })

    it("reports missing participant references and changed delete behavior", () => {
        const metadata = matchingMetadata()
        const membershipReference = metadata.constraints.find(constraint => (
            constraint.objectName === "payments" &&
            constraint.kind === "foreign" &&
            constraint.columns.join(",") === "group_id,user_id"
        ))!
        membershipReference.deleteAction = "cascade"

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Foreign key on public.payments (group_id, user_id) must reference public.group_members (group_id, user_id) with ON DELETE RESTRICT."
        )
    })

    it("reports disabled or altered triggers without relying on trigger names", () => {
        const metadata = matchingMetadata()
        const immutableTrigger = metadata.triggers.find(trigger => (
            trigger.tableName === "expense_fx_snapshots" &&
            trigger.functionName === "kyisplit_protect_expense_fx"
        ))!
        immutableTrigger.enabled = false

        const issues = findSchemaCompatibilityIssues(requirements, metadata)
        expect(issues).toContain(
            "Required trigger on public.expense_fx_snapshots is disabled."
        )
    })

    it("reports altered trigger events", () => {
        const metadata = matchingMetadata()
        const immutableTrigger = metadata.triggers.find(trigger => (
            trigger.tableName === "expense_fx_snapshots" &&
            trigger.functionName === "kyisplit_protect_expense_fx"
        ))!
        immutableTrigger.events = ["UPDATE"]

        const issues = findSchemaCompatibilityIssues(requirements, metadata)
        expect(issues).toContain(
            "Missing BEFORE UPDATE OR DELETE row trigger on public.expense_fx_snapshots for kyisplit_protect_expense_fx."
        )
    })

    it("reports changed trigger function bodies", () => {
        const metadata = matchingMetadata()
        const balanceFunction = metadata.functions.find(fn => (
            fn.name === "kyisplit_assert_expense_balanced"
        ))!
        balanceFunction.body = balanceFunction.body.replace(
            "payment_total <> expense_total",
            "payment_total = expense_total"
        )

        expect(findSchemaCompatibilityIssues(requirements, metadata)).toContain(
            "Function public.kyisplit_assert_expense_balanced differs from its schema-reference definition."
        )
    })
})

describe("explicit schema-check target", () => {
    it("requires a PostgreSQL URL in the command arguments", () => {
        expect(parseExplicitDatabaseUrl([
            "--database-url",
            "postgresql://schema-check@127.0.0.1/kyisplit_test"
        ])).toBe("postgresql://schema-check@127.0.0.1/kyisplit_test")
        expect(() => parseExplicitDatabaseUrl([])).toThrow(
            "Pass an explicit --database-url target."
        )
        expect(() => parseExplicitDatabaseUrl([
            "--database-url",
            "postgresql://localhost"
        ])).toThrow("The explicit database target must be a PostgreSQL URL.")
    })
})

describe("PostgreSQL catalog compatibility", () => {
    it("accepts catalog rows captured from PostgreSQL 17 after applying the reference", async () => {
        await expect(assertSchemaCompatibility(
            createCatalogClient(),
            referenceSql
        )).resolves.toBeUndefined()
    })

    it("preserves compound key order and rejects reordered foreign-key columns", async () => {
        const rows = structuredClone(catalogFixture)
        const paymentMemberKey = rows.constraints.find(row => {
            const constraint = row as Record<string, unknown>
            return constraint.object_name === "payments" &&
                constraint.object_kind === "foreign" &&
                constraint.referenced_table === "group_members"
        }) as Record<string, unknown>
        paymentMemberKey.columns = ["user_id", "group_id"]

        await expect(assertSchemaCompatibility(
            createCatalogClient(rows),
            referenceSql
        )).rejects.toThrow(
            "Foreign key on public.payments (group_id, user_id) must reference public.group_members (group_id, user_id) with ON DELETE RESTRICT."
        )
    })

    it("normalizes expression-index casts but rejects a changed index expression", async () => {
        const rows = structuredClone(catalogFixture)
        const userIndex = rows.indexes.find(row => (
            (row as Record<string, unknown>).table_name === "users"
        )) as Record<string, unknown>
        userIndex.definition = String(userIndex.definition).replace(
            "lower((email)::text)",
            "upper((email)::text)"
        )

        await expect(assertSchemaCompatibility(
            createCatalogClient(rows),
            referenceSql
        )).rejects.toThrow(
            "Missing unique index on public.users for lower(email)."
        )
    })

    it("preserves multi-column index key order and sort direction", async () => {
        const rows = structuredClone(catalogFixture)
        const repaymentIndex = rows.indexes.find(row => (
            (row as Record<string, unknown>).table_name === "repayments"
        )) as Record<string, unknown>
        repaymentIndex.definition = String(repaymentIndex.definition).replace(
            "group_id, repayment_date DESC",
            "repayment_date DESC, group_id"
        )

        await expect(assertSchemaCompatibility(
            createCatalogClient(rows),
            referenceSql
        )).rejects.toThrow(
            /Missing index on public\.repayments for group_id,\s+repayment_date DESC,\s+created_at DESC,\s+id DESC\./
        )
    })

    it("rejects catalog trigger rows with changed event semantics", async () => {
        const rows = structuredClone(catalogFixture)
        const fxTrigger = rows.triggers.find(row => {
            const trigger = row as Record<string, unknown>
            return trigger.table_name === "expense_fx_snapshots" &&
                trigger.function_name === "kyisplit_protect_expense_fx"
        }) as Record<string, unknown>
        fxTrigger.event_delete = false

        await expect(assertSchemaCompatibility(
            createCatalogClient(rows),
            referenceSql
        )).rejects.toThrow(
            "Missing BEFORE UPDATE OR DELETE row trigger on public.expense_fx_snapshots for kyisplit_protect_expense_fx."
        )
    })

    it("runs catalog inspection queries sequentially on a single client", async () => {
        let activeQueries = 0
        let maximumActiveQueries = 0
        const client = {
            async query<Row>() {
                activeQueries += 1
                maximumActiveQueries = Math.max(maximumActiveQueries, activeQueries)
                await new Promise(resolve => setTimeout(resolve, 0))
                activeQueries -= 1
                return { rows: [] as Row[] }
            }
        }

        await expect(assertSchemaCompatibility(client, referenceSql)).rejects.toThrow(
            "Database schema does not match roadmap/schema-reference.sql:"
        )
        expect(maximumActiveQueries).toBe(1)
    })
})
