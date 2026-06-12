import express from 'express'

import { addGroup, addMember, enterGroup, getGroupList } from '../controllers/groupController'
import { getBalance } from '../controllers/balanceController'

import authMiddleware from '../middleware/authMiddleware'


const router = express.Router()

router.use(authMiddleware)

router.post("/addgroup", addGroup)

router.post("/addmember", addMember)

router.get("/grouplist", getGroupList)

router.get("/:groupId", enterGroup)

router.get("/:groupId/getbalance", getBalance)
router.get("/:groupId/getbalance", getBalance)

export default router
// router.post('/deletemember', deleteMemeber)


// POST   /api/groups              ← create group
// GET    /api/groups              ← get all groups for logged in user
// GET    /api/groups/:groupId     ← get specific group + members
// POST   /api/groups/:groupId/members  ← add member to group
// ```s