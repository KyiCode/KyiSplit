import express from 'express'
import database from '../db'
import { Request, Response } from 'express'
import { json } from 'node:stream/consumers'


export const addGroup = async (req: Request, res: Response) => {
    console.log("adding group")
    try {
        const { userId, groupName } = req.body

        const result = await database.query(
            'INSERT into groups (name) VALUES ($1) RETURNING id',
            [groupName]
        )

        const groupId = result.rows[0].id

        await database.query(
            'INSERT into group_members (user_id,group_id) VALUES ($1, $2)',
            [userId, groupId]
        )

        return res.status(201).json({ message: "Group Added" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error adding group" })
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
    try {
        const user = req.user.userId

        const groupResults = await database.query(
            'SELECT group_id FROM group_members WHERE user_id = $1',
            [user]
        )

        const groupIds = groupResults.rows

        const queryResult = await Promise.all(groupIds.map(grp => database.query(
            'SELECT * FROM group_members WHERE group_id = $1',
            [grp.group_id]
        )))

        const groupMembers = queryResult.map(res => res.rows).flat()

        return res.json(groupMembers)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error getting grouplist" })
    }
}

export const enterGroup = async (req: Request, res: Response) => {
    console.log("entering group")
    try {
        const user = req.body.user
        const group = req.body.group

        return res.json(user)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error entering group" })
    }
}