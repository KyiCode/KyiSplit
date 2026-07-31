import jwt from 'jsonwebtoken'
import { Response } from 'express';
import { readAuthConfig } from '../config';

const SESSION_DURATION_DAYS = 10
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * SESSION_DURATION_DAYS

function sessionCookieAttributes() {
    const { isProduction } = readAuthConfig()
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict" as const
    }
}

const generateToken = (userId: string, res: Response) => {
    const payload = { userId: userId };
    const { jwtKey } = readAuthConfig()

    const token = jwt.sign(payload, jwtKey, {
        expiresIn: `${SESSION_DURATION_DAYS}d`,
    });

    res.cookie("jwt", token, {
        ...sessionCookieAttributes(),
        maxAge: SESSION_DURATION_MS
    })

    return token;
};

export function clearSessionCookie(res: Response) {
    res.clearCookie("jwt", sessionCookieAttributes())
}

export default generateToken
