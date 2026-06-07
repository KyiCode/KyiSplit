import express from 'express'

import { addExpense, addPayer, addSplit, enterExpensee, getExpenseList } from '../controllers/expenseController'

import authMiddleware from '../middleware/authMiddleware'
import { getGroupList } from '../controllers/groupController'


const router = express.Router()

router.use(authMiddleware)

router.post("/addexpense", addExpense)
router.post("/addpayer", addPayer)
router.post("/addsplit", addSplit)

// router.delete('/deleteexpense')

router.get("/expenselist", getExpenseList)

router.get("/enterexpense", enterExpensee)

export default router

// GET    /api/expenses/:groupId        ← get all expenses in group
// POST   /api/expenses/:groupId        ← add expense
// DELETE /api/expenses/:expenseId      ← delete expense
// POST   /api/expenses/:expenseId/payments  ← add payer
// POST   /api/expenses/:expenseId/splits    ← add split
// GET    /api/expenses/:groupId/balances    ← calculate balances