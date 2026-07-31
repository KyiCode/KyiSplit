import express from 'express'

import {
    addExpense,
    deleteExpense,
    getExpenseList
} from '../controllers/expenseController'

import authMiddleware from '../middleware/authMiddleware'


const router = express.Router()

router.use(authMiddleware)

router.post("/addexpense", addExpense)

router.get("/:groupId", getExpenseList)
router.delete("/:groupId/:expenseId", deleteExpense)


export default router

// GET    /api/expenses/:groupId        ← get all expenses in group
// POST   /api/expenses/:groupId        ← add expense
// DELETE /api/expenses/:expenseId      ← delete expense
// POST   /api/expenses/:expenseId/payments  ← add payer
// POST   /api/expenses/:expenseId/splits    ← add split
// GET    /api/expenses/:groupId/balances    ← calculate balances
