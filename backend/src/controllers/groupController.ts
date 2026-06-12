import express from 'express'
import database from '../db'
import { Request, Response } from 'express'
import { json } from 'node:stream/consumers'
import { getGroupMembers, getGroupName, getUserGroups } from '../utils/queries'
import { isUserAuthorised } from '../utils/validators'


export const addGroup = async (req: Request, res: Response) => {
    console.log("adding group")
    const userId = req.user.userId
    const groupName = req.body.groupName
    try {
        const result = await database.query(
            'INSERT into groups (name) VALUES ($1) RETURNING id',
            [groupName]
        )

        const groupId = result.rows[0].id

        await database.query(
            'INSERT into group_members (user_id,group_id) VALUES ($1, $2)',
            [userId, groupId]
        )

        return res.status(201).json({ status: "success", message: "Group Added" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: "error", error: "server error adding group" })
    }

}

export const addMember = async (req: Request, res: Response) => {
    console.log("adding member")
    try {
        const { userId, groupId } = req.body

        const findGroup = await database.query(
            'SELECT * FROM groups WHERE id = $1',
            [groupId]
        )

        const findUser = await database.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        )

        const userAlreadyInGroup = await database.query(
            'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
            [userId, groupId]
        )

        // error where user already in group not caught
        if (findGroup.rows.length == 0 || findUser.rows.length == 0) return res.json({ message: "Group or User invalid" })
        if (userAlreadyInGroup.rows.length > 0) return res.json({ message: "User already in group" })

        await database.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [groupId, userId]
        )

        return res.status(201).json({ Status: "success" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error adding Member" })
    }
}

export const getGroupList = async (req: Request, res: Response) => {
    console.log("getting group list")
    const user = req.user.userId
    try {
        const groups = await getUserGroups(user)
        const groupDetails = await Promise.all(
            groups.map(async (group) => ({
                groupId: group.group_id,
                groupName: await getGroupName(group.group_id),
                groupMembers: await getGroupMembers(group.group_id)
            }))
        )
        return res.status(200).json({ status: "success", user, groupDetails })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error getting grouplist" })
    }
}

// export const getGroupMembers = (req: Request, res: Response) => {
//     console.log("getting group members")
//     try {
//         const user = req.user.userId

//         const groupIds = getUserGroups(user)

//         const queryResult = await Promise.all(groupIds.map(grp => database.query(
//             'SELECT * FROM group_members WHERE group_id = $1',
//             [grp.group_id]
//         )))

//         const groupMembers = queryResult.map(res => res.rows).flat()

//         return res.json(groupMembers)
//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ error: "server error getting grouplist" })
//     }

// }

export const enterGroup = async (req: Request, res: Response) => {
    console.log("entering group")
    const user = req.user.userId
    const group = req.params.groupId as string
    try {
        const valid = await isUserAuthorised(user, group)
        return valid ? res.status(200).json({ status: "success" }) : res.status(400).json({ message: "User unauthorised or Invalid group" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "server error entering group" })
    }
}