import express from 'express'
import database from '../db'
import { Request, Response } from 'express'


export const addGroup = async (req: Request, res: Response) => {
    try {
        const { userId, groupName } = req.body

        const result = await database.query(
            'INSERT into groups (name) VALUES ($1) RETURNING id',
            [groupName]
        )

        const groupId = result.rows[0].id

        await database.query(
            'INSERT into group_members (group_id, user_id) VALUES ($1, S2)',
            [userId, groupId]
        )

        return res.status(201).json({ message: "Group Added" })
    } catch (error) {
        return res.status(500).json({ error: "server error adding group" })
    }

}

export const addMember = async (req: Request, res: Response) => {
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

        if (findGroup.rows.length == 0 || findUser.rows.length == 0) return res.json({ message: "Group or User invalid" })
        if (userAlreadyInGroup.rows.length > 0) return res.json({ message: "User already in group" })

        await database.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [groupId, userId]
        )

        return res.status(201).json({ Status: "success" })
    } catch (error) {
        return res.status(500).json({ error: "server error adding Member" })
    }
}
