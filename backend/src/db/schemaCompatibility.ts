import { readFileSync } from "node:fs"
import path from "node:path"

export interface SchemaColumn {
    tableName: string
    columnName: string
    type: string
    nullable: boolean
}

export type SchemaConstraintKind =
    | "primary"
    | "unique"
    | "foreign"
    | "check"
    | "domain"

export interface SchemaConstraint {
    objectName: string
    kind: SchemaConstraintKind
    columns: string[]
    referencedSchema?: string
    referencedTable?: string
    referencedColumns?: string[]
    deleteAction?: string
    expression?: string
    validated?: boolean
}

export interface SchemaIndex {
    tableName: string
    unique: boolean
    expression: string
    valid?: boolean
}

export interface SchemaTrigger {
    tableName: string
    timing: "before" | "after"
    events: string[]
    rowLevel: boolean
    constraint: boolean
    deferrable: boolean
    initiallyDeferred: boolean
    functionSchema: string
    functionName: string
    enabled?: boolean
}

export interface SchemaFunction {
    schemaName: string
    name: string
    language: string
    body: string
}

export interface SchemaRequirements {
    columns: SchemaColumn[]
    constraints: SchemaConstraint[]
    indexes: SchemaIndex[]
    triggers: SchemaTrigger[]
    functions: SchemaFunction[]
}

export interface SchemaMetadata {
    columns: SchemaColumn[]
    constraints: SchemaConstraint[]
    indexes: SchemaIndex[]
    triggers: SchemaTrigger[]
    functions: SchemaFunction[]
}

interface QueryResult<Row> {
    rows: Row[]
}

interface Queryable {
    query<Row = Record<string, unknown>>(sql: string): Promise<QueryResult<Row>>
}

export function parseExplicitDatabaseUrl(arguments_: string[]) {
    if (
        arguments_.length !== 2 ||
        arguments_[0] !== "--database-url" ||
        !arguments_[1].trim()
    ) {
        throw new Error("Pass an explicit --database-url target.")
    }
    const databaseUrl = arguments_[1]
    try {
        const parsed = new URL(databaseUrl)
        if (
            !["postgres:", "postgresql:"].includes(parsed.protocol) ||
            parsed.pathname.length < 2
        ) {
            throw new Error()
        }
    } catch {
        throw new Error("The explicit database target must be a PostgreSQL URL.")
    }
    return databaseUrl
}

export function readSchemaRequirements(schemaSql: string): SchemaRequirements {
    const columns: SchemaColumn[] = []
    const constraints: SchemaConstraint[] = []
    const tables = new Map<string, string[]>()

    const tablePattern = /CREATE\s+TABLE\s+public\.([a-z_][a-z0-9_]*)\s*\(/gi
    for (const match of schemaSql.matchAll(tablePattern)) {
        const openIndex = match.index! + match[0].lastIndexOf("(")
        const { content } = readParenthesized(schemaSql, openIndex)
        const tableName = match[1].toLowerCase()
        const primaryKeys: string[][] = []
        for (const part of splitTopLevel(content)) {
            const constraint = parseTableConstraint(tableName, part)
            if (constraint) {
                constraints.push(constraint)
                if (constraint.kind === "primary") {
                    primaryKeys.push(constraint.columns)
                }
                continue
            }
            const column = parseColumn(tableName, part)
            if (column) {
                columns.push(column)
                if (/\bPRIMARY\s+KEY\b/i.test(part)) {
                    const key = { objectName: tableName, kind: "primary" as const, columns: [column.columnName] }
                    constraints.push(key)
                    primaryKeys.push(key.columns)
                } else if (/\bUNIQUE\b/i.test(part)) {
                    constraints.push({
                        objectName: tableName,
                        kind: "unique",
                        columns: [column.columnName]
                    })
                }
            }
        }
        tables.set(tableName, primaryKeys.flat())
    }

    for (const column of columns) {
        if (tables.get(column.tableName)?.includes(column.columnName)) {
            column.nullable = false
        }
    }

    const domainPattern = /CREATE\s+DOMAIN\s+public\.([a-z_][a-z0-9_]*)\s+AS\s+[\w.]+\s+CHECK\s*\(/gi
    for (const match of schemaSql.matchAll(domainPattern)) {
        const openIndex = match.index! + match[0].lastIndexOf("(")
        const { content } = readParenthesized(schemaSql, openIndex)
        constraints.push({
            objectName: match[1].toLowerCase(),
            kind: "domain",
            columns: [],
            expression: content.trim()
        })
    }

    const indexes: SchemaIndex[] = []
    const indexPattern = /CREATE\s+(UNIQUE\s+)?INDEX\s+[\w.]+\s+ON\s+public\.([a-z_][a-z0-9_]*)\s*(?:USING\s+\w+\s*)?\(/gi
    for (const match of schemaSql.matchAll(indexPattern)) {
        const openIndex = match.index! + match[0].lastIndexOf("(")
        const { content } = readParenthesized(schemaSql, openIndex)
        indexes.push({
            tableName: match[2].toLowerCase(),
            unique: Boolean(match[1]),
            expression: content.trim()
        })
    }

    const functions: SchemaFunction[] = []
    const functionPattern = /CREATE\s+FUNCTION\s+public\.([a-z_][a-z0-9_]*)\s*\(\s*\)[\s\S]*?LANGUAGE\s+([a-z_][a-z0-9_]*)\s+AS\s+\$\$([\s\S]*?)\$\$\s*;/gi
    for (const match of schemaSql.matchAll(functionPattern)) {
        functions.push({
            schemaName: "public",
            name: match[1].toLowerCase(),
            language: match[2].toLowerCase(),
            body: match[3].trim()
        })
    }

    const triggers: SchemaTrigger[] = []
    const triggerPattern = /CREATE\s+(CONSTRAINT\s+)?TRIGGER\s+[\w.]+\s+(BEFORE|AFTER)\s+([\s\S]*?)\s+ON\s+public\.([a-z_][a-z0-9_]*)([\s\S]*?)EXECUTE\s+FUNCTION\s+public\.([a-z_][a-z0-9_]*)\s*\(\s*\)\s*;/gi
    for (const match of schemaSql.matchAll(triggerPattern)) {
        const constraint = Boolean(match[1])
        const tail = match[5]
        triggers.push({
            tableName: match[4].toLowerCase(),
            timing: match[2].toLowerCase() as "before" | "after",
            events: match[3].split(/\s+OR\s+/i).map(event => event.trim().toUpperCase()),
            rowLevel: /\bFOR\s+EACH\s+ROW\b/i.test(tail),
            constraint,
            deferrable: constraint && /\bDEFERRABLE\b/i.test(tail),
            initiallyDeferred: constraint && /\bINITIALLY\s+DEFERRED\b/i.test(tail),
            functionSchema: "public",
            functionName: match[6].toLowerCase()
        })
    }

    return { columns, constraints, indexes, triggers, functions }
}

export function findSchemaCompatibilityIssues(
    requirements: SchemaRequirements,
    metadata: SchemaMetadata
) {
    const issues: string[] = []
    const actualColumns = new Map(metadata.columns.map(column => [
        `${column.tableName}.${column.columnName}`,
        column
    ]))
    for (const required of requirements.columns) {
        const key = `${required.tableName}.${required.columnName}`
        const actual = actualColumns.get(key)
        if (!actual) {
            issues.push(`Missing column public.${key}.`)
            continue
        }
        if (normalizeType(actual.type) !== normalizeType(required.type)) {
            const expectedType = normalizeType(required.type)
            const typeDescription = expectedType === "kyisplit_money"
                ? "domain public.kyisplit_money"
                : `type ${required.type}`
            issues.push(`Column public.${key} must use ${typeDescription}.`)
        }
        if (actual.nullable !== required.nullable) {
            issues.push(
                `Column public.${key} must be ${required.nullable ? "nullable" : "NOT NULL"}.`
            )
        }
    }

    for (const required of requirements.constraints) {
        const candidates = metadata.constraints.filter(actual => (
            actual.objectName === required.objectName &&
            actual.kind === required.kind
        ))
        const matching = candidates.find(actual => (
            constraintsMatch(required, actual)
        ))
        if (!matching) {
            issues.push(describeMissingConstraint(required))
        } else if (matching.validated === false) {
            issues.push(
                `Constraint on public.${required.objectName} is not validated.`
            )
        }
    }

    for (const required of requirements.indexes) {
        const matching = metadata.indexes.find(actual => (
            actual.tableName === required.tableName &&
            actual.unique === required.unique &&
            normalizeIndexExpression(actual.expression) ===
                normalizeIndexExpression(required.expression)
        ))
        if (!matching) {
            issues.push(
                `Missing ${required.unique ? "unique " : ""}index on public.${required.tableName} for ${required.expression}.`
            )
        } else if (matching.valid === false) {
            issues.push(`Index on public.${required.tableName} is not valid.`)
        }
    }

    for (const required of requirements.triggers) {
        const candidates = metadata.triggers.filter(actual => (
            triggerShapeMatches(required, actual)
        ))
        const enabled = candidates.find(actual => actual.enabled !== false)
        if (!enabled) {
            if (candidates.length > 0) {
                issues.push(
                    `Required trigger on public.${required.tableName} is disabled.`
                )
            } else {
                issues.push(describeMissingTrigger(required))
            }
        }
    }

    const actualFunctions = new Map(metadata.functions.map(fn => [
        `${fn.schemaName}.${fn.name}`,
        fn
    ]))
    for (const required of requirements.functions) {
        const key = `${required.schemaName}.${required.name}`
        const actual = actualFunctions.get(key)
        if (!actual) {
            issues.push(`Missing function ${key}.`)
            continue
        }
        if (
            actual.language.toLowerCase() !== required.language.toLowerCase() ||
            normalizeFunctionBody(actual.body) !== normalizeFunctionBody(required.body)
        ) {
            issues.push(
                `Function ${key} differs from its schema-reference definition.`
            )
        }
    }

    return [...new Set(issues)]
}

export async function assertSchemaCompatibility(
    client: Queryable,
    schemaSql = readSchemaReference()
) {
    const requirements = readSchemaRequirements(schemaSql)
    const metadata = await readSchemaMetadata(client)
    const issues = findSchemaCompatibilityIssues(requirements, metadata)
    if (issues.length > 0) {
        throw new Error(
            `Database schema does not match roadmap/schema-reference.sql:\n${issues.map(issue => `- ${issue}`).join("\n")}`
        )
    }
}

async function readSchemaMetadata(client: Queryable): Promise<SchemaMetadata> {
    const [columnsResult, constraintsResult, indexesResult, triggersResult, functionsResult] = await Promise.all([
        client.query<{
            table_name: string
            column_name: string
            column_type: string
            is_not_null: boolean
        }>(`
            SELECT rel.relname AS table_name,
                   attribute.attname AS column_name,
                   format_type(attribute.atttypid, attribute.atttypmod) AS column_type,
                   attribute.attnotnull AS is_not_null
            FROM pg_attribute AS attribute
            JOIN pg_class AS rel ON rel.oid = attribute.attrelid
            JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
            WHERE ns.nspname = 'public'
              AND rel.relkind IN ('r', 'p')
              AND attribute.attnum > 0
              AND NOT attribute.attisdropped
        `),
        client.query<{
            object_name: string
            object_kind: string
            columns: string[]
            referenced_schema: string | null
            referenced_table: string | null
            referenced_columns: string[] | null
            delete_action: string | null
            definition: string
            is_validated: boolean
        }>(`
            SELECT COALESCE(rel.relname, domain_type.typname) AS object_name,
                   CASE
                       WHEN domain_type.oid IS NOT NULL AND con.contype = 'c' THEN 'domain'
                       WHEN con.contype = 'p' THEN 'primary'
                       WHEN con.contype = 'u' THEN 'unique'
                       WHEN con.contype = 'f' THEN 'foreign'
                       WHEN con.contype = 'c' THEN 'check'
                   END AS object_kind,
                   ARRAY(
                       SELECT attribute.attname
                       FROM unnest(con.conkey) WITH ORDINALITY AS att_key(attnum, ordinal_position)
                       JOIN pg_attribute AS attribute
                         ON attribute.attrelid = con.conrelid
                        AND attribute.attnum = att_key.attnum
                       ORDER BY att_key.ordinal_position
                   ) AS columns,
                   referenced_ns.nspname AS referenced_schema,
                   referenced_rel.relname AS referenced_table,
                   ARRAY(
                       SELECT attribute.attname
                       FROM unnest(con.confkey) WITH ORDINALITY AS att_key(attnum, ordinal_position)
                       JOIN pg_attribute AS attribute
                         ON attribute.attrelid = con.confrelid
                        AND attribute.attnum = att_key.attnum
                       ORDER BY att_key.ordinal_position
                   ) AS referenced_columns,
                   CASE con.confdeltype
                       WHEN 'a' THEN 'NO ACTION'
                       WHEN 'r' THEN 'RESTRICT'
                       WHEN 'c' THEN 'CASCADE'
                       WHEN 'n' THEN 'SET NULL'
                       WHEN 'd' THEN 'SET DEFAULT'
                       ELSE NULL
                   END AS delete_action,
                   pg_get_constraintdef(con.oid, true) AS definition,
                   con.convalidated AS is_validated
            FROM pg_constraint AS con
            JOIN pg_namespace AS ns ON ns.oid = con.connamespace
            LEFT JOIN pg_class AS rel ON rel.oid = con.conrelid
            LEFT JOIN pg_type AS domain_type ON domain_type.oid = con.contypid
            LEFT JOIN pg_class AS referenced_rel
              ON referenced_rel.oid = con.confrelid
            LEFT JOIN pg_namespace AS referenced_ns
              ON referenced_ns.oid = referenced_rel.relnamespace
            WHERE ns.nspname = 'public'
        `),
        client.query<{
            table_name: string
            is_unique: boolean
            is_valid: boolean
            definition: string
        }>(`
            SELECT table_rel.relname AS table_name,
                   idx.indisunique AS is_unique,
                   idx.indisvalid AS is_valid,
                   pg_get_indexdef(idx.indexrelid) AS definition
            FROM pg_index AS idx
            JOIN pg_class AS index_rel ON index_rel.oid = idx.indexrelid
            JOIN pg_class AS table_rel ON table_rel.oid = idx.indrelid
            JOIN pg_namespace AS ns ON ns.oid = table_rel.relnamespace
            WHERE ns.nspname = 'public'
              AND NOT EXISTS (
                  SELECT 1
                  FROM pg_constraint AS con
                  WHERE con.conindid = idx.indexrelid
              )
        `),
        client.query<{
            table_name: string
            enabled_state: string
            is_before: boolean
            event_insert: boolean
            event_update: boolean
            event_delete: boolean
            event_truncate: boolean
            row_level: boolean
            is_constraint: boolean
            is_deferrable: boolean
            is_initially_deferred: boolean
            function_name: string
            function_schema: string
        }>(`
            SELECT rel.relname AS table_name,
                   trg.tgenabled AS enabled_state,
                   (trg.tgtype & 2) <> 0 AS is_before,
                   (trg.tgtype & 4) <> 0 AS event_insert,
                   (trg.tgtype & 16) <> 0 AS event_update,
                   (trg.tgtype & 8) <> 0 AS event_delete,
                   (trg.tgtype & 32) <> 0 AS event_truncate,
                   (trg.tgtype & 1) <> 0 AS row_level,
                   trg.tgconstraint <> 0 AS is_constraint,
                   trg.tgdeferrable AS is_deferrable,
                   trg.tginitdeferred AS is_initially_deferred,
                   proc.proname AS function_name,
                   proc_ns.nspname AS function_schema
            FROM pg_trigger AS trg
            JOIN pg_class AS rel ON rel.oid = trg.tgrelid
            JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
            JOIN pg_proc AS proc ON proc.oid = trg.tgfoid
            JOIN pg_namespace AS proc_ns ON proc_ns.oid = proc.pronamespace
            WHERE ns.nspname = 'public'
              AND NOT trg.tgisinternal
        `),
        client.query<{
            schema_name: string
            name: string
            language: string
            body: string
        }>(`
            SELECT ns.nspname AS schema_name,
                   proc.proname AS name,
                   lan.lanname AS language,
                   proc.prosrc AS body
            FROM pg_proc AS proc
            JOIN pg_namespace AS ns ON ns.oid = proc.pronamespace
            JOIN pg_language AS lan ON lan.oid = proc.prolang
            WHERE ns.nspname = 'public'
              AND proc.prokind = 'f'
        `)
    ])

    return {
        columns: columnsResult.rows.map(column => ({
            tableName: column.table_name,
            columnName: column.column_name,
            type: column.column_type,
            nullable: !column.is_not_null
        })),
        constraints: constraintsResult.rows.map(constraint => {
            const kind = constraint.object_kind as SchemaConstraintKind
            return {
                objectName: constraint.object_name,
                kind,
                columns: constraint.columns || [],
                referencedSchema: constraint.referenced_schema || undefined,
                referencedTable: constraint.referenced_table || undefined,
                referencedColumns: constraint.referenced_columns || undefined,
                deleteAction: constraint.delete_action || undefined,
                expression: kind === "check" || kind === "domain"
                    ? extractCheckExpression(constraint.definition)
                    : undefined,
                validated: constraint.is_validated
            }
        }),
        indexes: indexesResult.rows.map(index => ({
            tableName: index.table_name,
            unique: index.is_unique,
            valid: index.is_valid,
            expression: extractIndexExpression(index.definition)
        })),
        triggers: triggersResult.rows.map(trigger => {
            const events: string[] = []
            if (trigger.event_insert) events.push("INSERT")
            if (trigger.event_update) events.push("UPDATE")
            if (trigger.event_delete) events.push("DELETE")
            if (trigger.event_truncate) events.push("TRUNCATE")
            return {
                tableName: trigger.table_name,
                timing: trigger.is_before ? "before" : "after",
                events,
                rowLevel: trigger.row_level,
                constraint: trigger.is_constraint,
                deferrable: trigger.is_deferrable,
                initiallyDeferred: trigger.is_initially_deferred,
                functionSchema: trigger.function_schema,
                functionName: trigger.function_name,
                enabled: trigger.enabled_state === "O" || trigger.enabled_state === "A"
            }
        }),
        functions: functionsResult.rows.map(fn => ({
            schemaName: fn.schema_name,
            name: fn.name,
            language: fn.language,
            body: fn.body
        }))
    }
}

function readSchemaReference() {
    return readFileSync(
        path.resolve(__dirname, "../../../roadmap/schema-reference.sql"),
        "utf8"
    )
}

function parseColumn(tableName: string, definition: string): SchemaColumn | undefined {
    const match = definition.trim().match(/^([a-z_][a-z0-9_]*)\s+([\s\S]+)$/i)
    if (!match || /^CONSTRAINT\b/i.test(definition.trim())) return undefined
    const columnName = match[1].toLowerCase()
    const body = match[2].trim()
    const modifier = body.search(/\s+(?:NOT\s+NULL|NULL\b|DEFAULT\b|UNIQUE\b|PRIMARY\s+KEY\b|CHECK\s*\(|REFERENCES\b|GENERATED\b|COLLATE\b)/i)
    const type = (modifier === -1 ? body : body.slice(0, modifier))
        .trim()
        .replace(/^public\./i, "")
    return {
        tableName,
        columnName,
        type,
        nullable: !/\bNOT\s+NULL\b/i.test(body) && !/\bPRIMARY\s+KEY\b/i.test(body)
    }
}

function parseTableConstraint(
    tableName: string,
    definition: string
): SchemaConstraint | undefined {
    const body = definition.trim().replace(/^CONSTRAINT\s+[\w.]+\s+/i, "")
    if (/^PRIMARY\s+KEY\b/i.test(body)) {
        return { objectName: tableName, kind: "primary", columns: firstParenthesized(body).split(",").map(trimIdentifier) }
    }
    if (/^UNIQUE\b/i.test(body)) {
        return { objectName: tableName, kind: "unique", columns: firstParenthesized(body).split(",").map(trimIdentifier) }
    }
    if (/^FOREIGN\s+KEY\b/i.test(body)) {
        const localColumns = firstParenthesized(body).split(",").map(trimIdentifier)
        const reference = body.match(/REFERENCES\s+public\.([a-z_][a-z0-9_]*)\s*\(/i)
        if (!reference) return undefined
        const referenceOpen = body.indexOf("(", reference.index! + reference[0].length - 1)
        const referencedColumns = readParenthesized(body, referenceOpen).content
            .split(",")
            .map(trimIdentifier)
        const deleteAction = body.match(/\bON\s+DELETE\s+(NO\s+ACTION|RESTRICT|CASCADE|SET\s+NULL|SET\s+DEFAULT)\b/i)?.[1]
        return {
            objectName: tableName,
            kind: "foreign",
            columns: localColumns,
            referencedTable: reference[1].toLowerCase(),
            referencedSchema: "public",
            referencedColumns,
            deleteAction: deleteAction?.toUpperCase()
        }
    }
    if (/^CHECK\s*\(/i.test(body)) {
        return {
            objectName: tableName,
            kind: "check",
            columns: [],
            expression: firstParenthesized(body)
        }
    }
    return undefined
}

function constraintsMatch(required: SchemaConstraint, actual: SchemaConstraint) {
    if (required.kind === "primary" || required.kind === "unique") {
        return arraysEqual(required.columns, actual.columns)
    }
    if (required.kind === "foreign") {
        return arraysEqual(required.columns, actual.columns) &&
            required.referencedTable === actual.referencedTable &&
            required.referencedSchema === actual.referencedSchema &&
            arraysEqual(
                required.referencedColumns || [],
                actual.referencedColumns || []
            ) &&
            required.deleteAction === actual.deleteAction
    }
    return normalizeCheckExpression(required.expression || "") ===
        normalizeCheckExpression(actual.expression || "")
}

function describeMissingConstraint(required: SchemaConstraint) {
    if (required.kind === "foreign") {
        return `Foreign key on public.${required.objectName} (${required.columns.join(", ")}) must reference public.${required.referencedTable} (${(required.referencedColumns || []).join(", ")}) with ON DELETE ${required.deleteAction}.`
    }
    if (required.kind === "primary" || required.kind === "unique") {
        return `Missing ${required.kind === "primary" ? "primary key" : "unique key"} on public.${required.objectName} (${required.columns.join(", ")}).`
    }
    if (required.kind === "domain") {
        return `Missing money scale and range check on domain public.${required.objectName}.`
    }
    return `Missing check constraint on public.${required.objectName} for ${compactExpression(required.expression || "")}.`
}

function triggerShapeMatches(required: SchemaTrigger, actual: SchemaTrigger) {
    return actual.tableName === required.tableName &&
        actual.timing === required.timing &&
        arraysEqual([...actual.events].sort(), [...required.events].sort()) &&
        actual.rowLevel === required.rowLevel &&
        actual.constraint === required.constraint &&
        actual.deferrable === required.deferrable &&
        actual.initiallyDeferred === required.initiallyDeferred &&
        actual.functionSchema === required.functionSchema &&
        actual.functionName === required.functionName
}

function describeMissingTrigger(required: SchemaTrigger) {
    return `Missing ${required.timing.toUpperCase()} ${required.events.join(" OR ")} ${required.rowLevel ? "row " : ""}trigger on public.${required.tableName} for ${required.functionName}.`
}

function normalizeType(value: string) {
    return value
        .trim()
        .replace(/^public\./i, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([(),])\s*/g, "$1")
        .toLowerCase()
}

function normalizeCheckExpression(expression: string) {
    const tokens = removeTypeCasts(tokenizeSql(expression))
    const ast = parseSqlExpression(tokens)
    return JSON.stringify(ast)
}

function normalizeIndexExpression(expression: string) {
    return removePublicQualification(tokenizeSql(expression)).join(" ").toLowerCase()
}

function normalizeFunctionBody(body: string) {
    return removePublicQualification(tokenizeSql(body)).join(" ")
}

function compactExpression(expression: string) {
    return expression.replace(/\s+/g, " ").trim()
}

function tokenizeSql(sql: string): string[] {
    const tokens: string[] = []
    let index = 0
    while (index < sql.length) {
        const character = sql[index]
        if (/\s/.test(character)) {
            index += 1
        } else if (sql.startsWith("--", index)) {
            const newline = sql.indexOf("\n", index + 2)
            index = newline === -1 ? sql.length : newline + 1
        } else if (sql.startsWith("/*", index)) {
            const end = sql.indexOf("*/", index + 2)
            index = end === -1 ? sql.length : end + 2
        } else if (character === "'") {
            const start = index
            index += 1
            while (index < sql.length) {
                if (sql[index] === "'" && sql[index + 1] === "'") {
                    index += 2
                } else if (sql[index] === "'") {
                    index += 1
                    break
                } else {
                    index += 1
                }
            }
            tokens.push(sql.slice(start, index))
        } else if (character === '"') {
            index += 1
            let identifier = ""
            while (index < sql.length) {
                if (sql[index] === '"' && sql[index + 1] === '"') {
                    identifier += '"'
                    index += 2
                } else if (sql[index] === '"') {
                    index += 1
                    break
                } else {
                    identifier += sql[index]
                    index += 1
                }
            }
            tokens.push(identifier.toLowerCase())
        } else if (/[a-z_$]/i.test(character)) {
            const start = index++
            while (index < sql.length && /[a-z0-9_$]/i.test(sql[index])) index += 1
            tokens.push(sql.slice(start, index).toLowerCase())
        } else if (/[0-9]/.test(character)) {
            const start = index++
            while (index < sql.length && /[0-9.]/.test(sql[index])) index += 1
            tokens.push(sql.slice(start, index))
        } else {
            const operator = ["<=", ">=", "<>", "!=", "::"].find(value => (
                sql.startsWith(value, index)
            ))
            if (operator) {
                tokens.push(operator)
                index += operator.length
            } else {
                tokens.push(character)
                index += 1
            }
        }
    }
    return tokens
}

function removePublicQualification(tokens: string[]) {
    return tokens.filter((token, index) => (
        !(token === "public" && tokens[index + 1] === ".") &&
        !(token === "." && tokens[index - 1] === "public")
    ))
}

function removeTypeCasts(tokens: string[]) {
    const result: string[] = []
    const castTypes = new Set([
        "bigint", "boolean", "character", "date", "double", "integer",
        "numeric", "precision", "real", "text", "timestamp", "varying",
        "with", "time", "zone", "uuid"
    ])
    for (let index = 0; index < tokens.length; index += 1) {
        if (tokens[index] !== "::") {
            result.push(tokens[index])
            continue
        }
        index += 1
        if (tokens[index] === "pg_catalog" || tokens[index] === "public") index += 2
        while (index < tokens.length && castTypes.has(tokens[index])) index += 1
        if (tokens[index] === "(") {
            let depth = 0
            do {
                if (tokens[index] === "(") depth += 1
                if (tokens[index] === ")") depth -= 1
                index += 1
            } while (index < tokens.length && depth > 0)
        }
        index -= 1
    }
    return result
}

function parseSqlExpression(tokens: string[]): unknown {
    let position = 0

    function parsePrimary(): unknown {
        const token = tokens[position]
        if (token === "(") {
            position += 1
            const expression = parseBinary(0)
            if (tokens[position] === ")") position += 1
            return expression
        }
        if (token === "not" || token === "-") {
            position += 1
            return ["unary", token, parsePrimary()]
        }
        if (!token) return ["missing"]
        position += 1
        if (tokens[position] === "(") {
            position += 1
            const arguments_: unknown[] = []
            while (position < tokens.length && tokens[position] !== ")") {
                arguments_.push(parseBinary(0))
                if (tokens[position] === ",") position += 1
                else break
            }
            if (tokens[position] === ")") position += 1
            return ["call", token, ...arguments_]
        }
        return ["atom", token]
    }

    function precedence(token: string) {
        if (token === "or") return 1
        if (token === "and") return 2
        if (["=", "<>", "!=", "<", ">", "<=", ">=", "~", "between", "is"].includes(token)) return 3
        return -1
    }

    function parseBinary(minimumPrecedence: number): unknown {
        let left = parsePrimary()
        while (position < tokens.length) {
            const operator = tokens[position]
            const operatorPrecedence = precedence(operator)
            if (operatorPrecedence < minimumPrecedence) break
            position += 1
            if (operator === "between") {
                const lower = parseBinary(operatorPrecedence + 1)
                if (tokens[position] === "and") position += 1
                const upper = parseBinary(operatorPrecedence + 1)
                left = [
                    "and",
                    [">=", left, lower],
                    ["<=", left, upper]
                ]
                continue
            }
            if (operator === "is" && tokens[position] === "not") position += 1
            const right = parseBinary(operatorPrecedence + 1)
            left = [operator === "!=" ? "<>" : operator, left, right]
        }
        return left
    }

    return parseBinary(0)
}

function extractCheckExpression(definition: string) {
    const check = definition.match(/\bCHECK\s*\(/i)
    if (!check) return ""
    const openIndex = definition.indexOf("(", check.index! + check[0].length - 1)
    return readParenthesized(definition, openIndex).content.trim()
}

function extractIndexExpression(definition: string) {
    const on = definition.match(/\bON\s+(?:ONLY\s+)?(?:public\.)?[^\s]+\s+(?:USING\s+\w+\s*)?\(/i)
    if (!on) return ""
    const openIndex = definition.indexOf("(", on.index! + on[0].length - 1)
    return readParenthesized(definition, openIndex).content.trim()
}

function firstParenthesized(value: string) {
    const openIndex = value.indexOf("(")
    return openIndex === -1 ? "" : readParenthesized(value, openIndex).content.trim()
}

function readParenthesized(value: string, openIndex: number) {
    let depth = 0
    let quote: "single" | "double" | undefined
    for (let index = openIndex; index < value.length; index += 1) {
        const character = value[index]
        if (quote === "single") {
            if (character === "'" && value[index + 1] === "'") index += 1
            else if (character === "'") quote = undefined
            continue
        }
        if (quote === "double") {
            if (character === '"' && value[index + 1] === '"') index += 1
            else if (character === '"') quote = undefined
            continue
        }
        if (character === "'") quote = "single"
        else if (character === '"') quote = "double"
        else if (character === "(") depth += 1
        else if (character === ")") {
            depth -= 1
            if (depth === 0) {
                return { content: value.slice(openIndex + 1, index), endIndex: index }
            }
        }
    }
    throw new Error("Unbalanced parentheses in schema reference.")
}

function splitTopLevel(value: string) {
    const parts: string[] = []
    let start = 0
    let depth = 0
    let quote: "single" | "double" | undefined
    for (let index = 0; index < value.length; index += 1) {
        const character = value[index]
        if (quote === "single") {
            if (character === "'" && value[index + 1] === "'") index += 1
            else if (character === "'") quote = undefined
            continue
        }
        if (quote === "double") {
            if (character === '"' && value[index + 1] === '"') index += 1
            else if (character === '"') quote = undefined
            continue
        }
        if (character === "'") quote = "single"
        else if (character === '"') quote = "double"
        else if (character === "(") depth += 1
        else if (character === ")") depth -= 1
        else if (character === "," && depth === 0) {
            parts.push(value.slice(start, index).trim())
            start = index + 1
        }
    }
    parts.push(value.slice(start).trim())
    return parts.filter(Boolean)
}

function trimIdentifier(value: string) {
    return value.trim().replace(/^"|"$/g, "").toLowerCase()
}

function arraysEqual(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => (
        value.toLowerCase() === right[index]?.toLowerCase()
    ))
}
