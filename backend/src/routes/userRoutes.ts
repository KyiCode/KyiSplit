import express from 'express'
import { signup, login, logout, verifySession } from '../controllers/userController'
import authMiddleware from '../middleware/authMiddleware'
import { createRateLimiter, type RateLimitOptions } from '../middleware/rateLimit'

export function createUserRoutes(
    abuseControl: RateLimitOptions = { maxAttempts: 10, windowMs: 60000 }
) {
    const router = express.Router()
    const signupLimiter = createRateLimiter(abuseControl)
    const loginLimiter = createRateLimiter(abuseControl)

    router.post('/signup', signupLimiter, signup)
    router.post('/login', loginLimiter, login)
    router.post('/logout', logout)
    router.get('/verifysession', authMiddleware, verifySession)
    return router
}

const router = createUserRoutes()

export default router
