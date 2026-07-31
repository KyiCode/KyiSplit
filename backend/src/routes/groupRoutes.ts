import express from 'express'

import { addGroup, getGroup, getGroupList, getGroupMembers, getInvite, joinGroup } from '../controllers/groupController'
import { getBalance } from '../controllers/balanceController'
import {
    createRepayment,
    deleteRepayment,
    listRepayments
} from '../controllers/repaymentController'

import authMiddleware from '../middleware/authMiddleware'




const router = express.Router()

router.use(authMiddleware)

router.post("/addgroup", addGroup)

router.get("/grouplist", getGroupList)

router.get("/:groupId", getGroup)

router.get("/:groupId/members", getGroupMembers)

router.post("/:groupId/invite", getInvite)
router.post("/join/:token", joinGroup)

router.get("/:groupId/getbalance", getBalance)

router.get("/:groupId/repayments", listRepayments)
router.post("/:groupId/repayments", createRepayment)
router.delete("/:groupId/repayments/:repaymentId", deleteRepayment)

export default router
// router.post('/deletemember', deleteMemeber)


// POST   /api/groups              ← create group
// GET    /api/groups              ← get all groups for logged in user
// GET    /api/groups/:groupId     ← get specific group + members
// POST   /api/groups/:groupId/members  ← add member to group
// ```s
