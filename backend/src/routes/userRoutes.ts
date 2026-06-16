import express from 'express'
import { signup, login, verifySession } from '../controllers/userController'
import { verify } from 'node:crypto'
import authMiddleware from '../middleware/authMiddleware'


const router = express.Router()


router.post('/signup', signup)

router.post('/login', login)
router.get('/verifysession', authMiddleware, verifySession);

export default router