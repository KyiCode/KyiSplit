import express from 'express'
import database from '../db'
import { Request, Response } from 'express'
import { json } from 'node:stream/consumers'
import { queryGroupMembers, getGroupName, getUserGroups } from '../utils/queries'
import { isUserAuthorised, isValidInvite } from '../utils/validators'
import { generateInvite } from '../utils/inviteGenerator'


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
                groupMembers: await queryGroupMembers(group.group_id)
            }))
        )
        return res.status(200).json({ status: "success", user, groupDetails })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error getting grouplist" })
    }
}

export const getGroupMembers = async (req: Request, res: Response) => {
    console.log("getting group members")
    const user = req.user.userId
    const groupId = req.params.groupId as string
    try {
        if (!isUserAuthorised(user, groupId)) return res.status(400).json({ status: "fail", message: " error getting members" })

        const queryResult = await queryGroupMembers(groupId)
        console.log(queryResult)

        return res.json(queryResult)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "server error getting grouplist" })
    }

}

// can combine with get grp members maybe
export const getGroup = async (req: Request, res: Response) => {
    console.log("entering group")
    const user = req.user.userId
    const group = req.params.groupId as string
    try {
        const valid = await isUserAuthorised(user, group)
        if (valid) {
            const groupName = await getGroupName(group)
            return res.status(200).json({ status: "success", groupName })
        } else {
            return res.status(400).json({ message: "User unauthorised or Invalid group" })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "server error entering group" })
    }
}

export const getInvite = async (req: Request, res: Response) => {
    console.log("generating invtie")
    const user = req.user.userId
    const groupId = req.params.groupId as string
    try {
        const valid = await isUserAuthorised(user, groupId)
        if (!valid) {
            return res.status(400).json({ message: "User unauthorised or Invalid group" })
        }
        const inviteToken = await generateInvite(groupId, user)
        if (!inviteToken) return res.status(400).json({ status: "fail", message: "generator error" })
        return res.status(200).json({ status: "success", inviteToken })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: "fail", message: "server error entering group" })
    }
}

export const joinGroup = async (req: Request, res: Response) => {
    console.log("attempting join invtie")
    const user = req.user.userId
    const token = req.params.token as string
    if (!user || !token) {
        console.log("here")
        return res.status(400).json({ status: "fail", message: "Expired cookie / Invalid token" })
    }
    try {
        const { isValid, groupId } = await isValidInvite(token)
        if (!isValid || !groupId) return res.status(400).json({ status: "fail", message: "not valid token" })
        if (await isUserAuthorised(user, groupId)) return res.status(400).json({ status: "fail", message: "user already in group" })
        const resu = await database.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)',
            [groupId, user]
        )

        console.log(resu)
        return res.status(200).json({ status: "success", groupId })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ status: "fail", message: "server unable to join" })
    }

}