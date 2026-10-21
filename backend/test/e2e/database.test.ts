import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
    assertSchemaCompatibility,
    E2EDatabaseStartupError,
    prepareRunPostgres,
    readPostgresConfig
} from '../../e2e/database'

const baseEnvironment = {
    E2E_DATABASE_NAME: 'kyisplit_e2e_template',
    E2E_DATABASE_USER: 'kyisplit_e2e',
    E2E_POSTGRES_BIN_DIR: 'C:/PostgreSQL/bin',
    E2E_POSTGRES_PORT: '55432',
    E2E_POSTGRES_RUN_ROOT: 'C:/project/test-results/postgres',
    E2E_POSTGRES_TEMPLATE_DIR: 'C:/project/.e2e/postgres-template',
    E2E_RUN_STATE_FILE: 'C:/project/test-results/e2e-database.json'
}

describe('E2E PostgreSQL guardrails', () => {
    it('classifies invalid startup settings without retaining their values', async () => {
        const environment = {
            DATABASE_URL: 'postgres://person:password@host/db',
            E2E_POSTGRES_TEMPLATE_DIR: 'secret-template-path'
        }

        const error = await prepareRunPostgres(environment).catch(value => value)

        expect(error).toBeInstanceOf(E2EDatabaseStartupError)
        expect(error).toMatchObject({
            stage: 'configuration',
            category: 'invalid-settings',
            message: 'E2E database startup failed'
        })
        expect(error.message).not.toContain('password')
    })

    it('classifies a missing PostgreSQL executable as a prerequisite failure', async () => {
        const error = await prepareRunPostgres(baseEnvironment).catch(value => value)

        expect(error).toBeInstanceOf(E2EDatabaseStartupError)
        expect(error).toMatchObject({
            stage: 'prerequisite',
            category: 'missing-postgres-binary',
            message: 'E2E database startup failed'
        })
        expect(error.message).not.toContain(baseEnvironment.E2E_POSTGRES_BIN_DIR)
    })

    it('accepts explicit template, binary, port, and run locations', () => {
        expect(readPostgresConfig(baseEnvironment)).toMatchObject({
            databaseName: 'kyisplit_e2e_template',
            databaseUser: 'kyisplit_e2e',
            port: 55432,
            templateDirectory: path.resolve(
                'C:/project/.e2e/postgres-template'
            )
        })
    })

    it.each([
        [
            { ...baseEnvironment, E2E_POSTGRES_TEMPLATE_DIR: undefined },
            'E2E_POSTGRES_TEMPLATE_DIR'
        ],
        [
            { ...baseEnvironment, E2E_POSTGRES_PORT: '0' },
            'E2E_POSTGRES_PORT'
        ],
        [
            {
                ...baseEnvironment,
                E2E_POSTGRES_TEMPLATE_DIR: baseEnvironment.E2E_POSTGRES_RUN_ROOT
            },
            'outside the disposable run root'
        ]
    ])('rejects unsafe configuration %#', (environment, message) => {
        expect(() => readPostgresConfig(environment)).toThrow(message)
    })

    it('rejects a template missing required schema metadata', async () => {
        const client = {
            query: vi.fn().mockResolvedValue({
                rows: []
            })
        }
        await expect(assertSchemaCompatibility(client as never)).rejects.toThrow(
            /schema-reference\.sql:/
        )
        expect(client.query).toHaveBeenCalledTimes(5)
    })
})
