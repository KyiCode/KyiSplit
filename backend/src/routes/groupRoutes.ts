import express from 'express'

import { addGroup, addMember } from '../controllers/groupController'


const router = express.Router()

router.post("/addgroup", addGroup)

router.post("/addmember", addMember)

// router.post('/deletemember', deleteMemeber)


// POST   /api/groups              ← create group
// GET    /api/groups              ← get all groups for logged in user
// GET    /api/groups/:groupId     ← get specific group + members
// POST   /api/groups/:groupId/members  ← add member to group
// ```