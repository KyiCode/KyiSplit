import express from 'express'
import { signup, login, logout, verifySession } from '../controllers/userController'
import authMiddleware from '../middleware/authMiddleware'


const router = express.Router()


router.post('/signup', signup)

router.post('/login', login)
router.post('/logout', logout)
router.get('/verifysession', authMiddleware, verifySession);

export default router
