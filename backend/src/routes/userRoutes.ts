import express from 'express'
import { signup, login } from '../controllers/userController'

import authMiddleware from '../middleware/authMiddleware'

const router = express.Router()

router.use(authMiddleware)

router.post('/signup', signup)

router.post('/login', login)

export default router