const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export interface Credentials {
    email: string
    password: string
}

export function parseCredentials(input: unknown): Credentials | null {
    if (!input || typeof input !== "object") return null

    const { email, password } = input as Record<string, unknown>
    if (typeof email !== "string" || typeof password !== "string") return null

    const normalizedEmail = email.trim().toLowerCase()
    if (
        normalizedEmail.length === 0 ||
        normalizedEmail.length > MAX_EMAIL_LENGTH ||
        !EMAIL_PATTERN.test(normalizedEmail) ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return null
    }

    return { email: normalizedEmail, password }
}
