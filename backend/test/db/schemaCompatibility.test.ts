import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
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
