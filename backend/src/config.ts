export interface AuthConfig {
    bcryptCost: number
    isProduction: boolean
    jwtKey: string
}

type Environment = Record<string, string | undefined>

export function readAuthConfig(environment: Environment = process.env): AuthConfig {
    const jwtKey = environment.JWT_KEY?.trim()
    if (!jwtKey) {
        throw new Error("JWT_KEY must be configured")
    }

    const rawBcryptCost = environment.BCRYPT_SALT
    const bcryptCost = Number(rawBcryptCost)
    if (
        !rawBcryptCost ||
        !Number.isInteger(bcryptCost) ||
        bcryptCost < 4 ||
        bcryptCost > 31
    ) {
        throw new Error("BCRYPT_SALT must be an integer from 4 through 31")
    }

    return {
        bcryptCost,
        isProduction: environment.NODE_ENV === "production",
        jwtKey
    }
}
