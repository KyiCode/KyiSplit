import { timingSafeEqual } from "node:crypto"
import { MAX_SIGNUP_PASSWORD_BYTES } from "../contracts/api"

const USERNAME_PATTERN = /^[a-z0-9_-]+$/
const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 32
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export interface Credentials {
    username: string
    password: string
}

export interface SignupCredentials extends Credentials {
    token: string
}

export function isSignupPasswordWithinByteLimit(password: string) {
    return Buffer.byteLength(password, "utf8") <= MAX_SIGNUP_PASSWORD_BYTES
}

export function parseCredentials(input: unknown): Credentials | null {
    if (!input || typeof input !== "object") return null

    const { username, password } = input as Record<string, unknown>
    if (typeof username !== "string" || typeof password !== "string") return null

    const normalizedUsername = username.trim().toLowerCase()
    if (
        normalizedUsername.length < MIN_USERNAME_LENGTH ||
        normalizedUsername.length > MAX_USERNAME_LENGTH ||
        !USERNAME_PATTERN.test(normalizedUsername) ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return null
    }

    return { username: normalizedUsername, password }
}

export function parseSignupCredentials(input: unknown): SignupCredentials | null {
    if (!input || typeof input !== "object") return null
    const credentials = parseCredentials(input)
    const { token } = input as Record<string, unknown>
    if (!credentials || typeof token !== "string" || token.trim().length === 0) {
        return null
    }

    return { ...credentials, token: token.trim() }
}

export function isSignupTokenValid(candidate: string, configured: string) {
    const candidateBytes = Buffer.from(candidate, "utf8")
    const configuredBytes = Buffer.from(configured, "utf8")
    return candidateBytes.length === configuredBytes.length &&
        timingSafeEqual(candidateBytes, configuredBytes)
}
