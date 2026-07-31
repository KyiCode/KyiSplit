import database from '../db'
import { Request, Response } from 'express'
import { queryGroupMembers, getGroupDetails, getUserGroups } from '../utils/queries'
import { isUserAuthorised, isValidInvite } from '../utils/validators'
import { generateInvite } from '../utils/inviteGenerator'
import { parseBoundedName, parseCurrencyCode } from '../utils/groupValidation'
import { runInTransaction } from '../utils/transaction'
import { sendFailure, sendSuccess } from '../contracts/http'
import { logger } from '../logging/logger'


export const addGroup = async (req: Request, res: Response) => {
    const userId = req.user.userId
    const groupName = parseBoundedName(req.body?.groupName, 100)
    const groupUserName = parseBoundedName(req.body?.groupUserName, 50)
    const defaultCurrency = parseCurrencyCode(req.body?.defaultCurrency)
    if (!groupName || !groupUserName || !defaultCurrency) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid group or display name"
        )
    }

    try {
        const groupId = await runInTransaction(async client => {
            const result = await client.query(
                `INSERT into groups (name, default_currency)
                 VALUES ($1, $2)
                 RETURNING id`,
                [groupName, defaultCurrency]
            )

            const createdGroupId = result.rows[0].id
            await client.query(
                'INSERT into group_members (user_id,group_id, user_group_name) VALUES ($1, $2, $3)',
                [userId, createdGroupId, groupUserName]
            )
            return createdGroupId
        })

        return sendSuccess(res, 201, {
            message: "Group Added",
            groupId,
            defaultCurrency
        })
    } catch (error) {
        logger.error("group_creation_failed", {
            operation: "add_group"
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error adding group"
        )
    }

}

export const getGroupList = async (req: Request, res: Response) => {
    const user = req.user.userId
    try {
        const groups = await getUserGroups(user)
        const groupDetails = await Promise.all(
            groups.map(async (group) => {
                const details = await getGroupDetails(group.group_id)
                return {
                    groupId: group.group_id,
                    ...details,
                    groupMembers: await queryGroupMembers(group.group_id)
                }
            })
        )
        return sendSuccess(res, 200, {
            userId: user,
            groups: groupDetails
        })
    } catch (error) {
        logger.error("group_list_failed", {
            operation: "list_groups"
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error getting group list"
        )
    }
}

export const getGroupMembers = async (req: Request, res: Response) => {
    const user = req.user.userId
    const groupId = req.params.groupId as string
    try {
        if (!(await isUserAuthorised(user, groupId))) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "Forbidden"
            )
        }

        const queryResult = await queryGroupMembers(groupId)

        return sendSuccess(res, 200, { members: queryResult })
    } catch (error) {
        logger.error("group_members_failed", {
            operation: "list_group_members",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error getting group members"
        )
    }

}

export const getGroup = async (req: Request, res: Response) => {
    const user = req.user.userId
    const group = req.params.groupId as string
    try {
        const valid = await isUserAuthorised(user, group)
        if (!valid) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "Forbidden"
            )
        }

        const groupDetails = await getGroupDetails(group)
        return sendSuccess(res, 200, groupDetails)
    } catch (error) {
        logger.error("group_detail_failed", {
            operation: "get_group",
            groupId: group
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error entering group"
        )
    }
}

export const getInvite = async (req: Request, res: Response) => {
    const user = req.user.userId
    const groupId = req.params.groupId as string
    try {
        const valid = await isUserAuthorised(user, groupId)
        if (!valid) {
            return sendFailure(
                res,
                403,
                "FORBIDDEN",
                "Forbidden"
            )
        }
        const inviteUrl = await generateInvite(groupId, user)
        return sendSuccess(res, 200, { inviteUrl })
    } catch (error) {
        logger.error("invite_creation_failed", {
            operation: "create_invite",
            groupId
        }, error)
        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server error creating invite"
        )
    }
}

export const joinGroup = async (req: Request, res: Response) => {
    const user = req.user.userId
    const token = req.params.token as string
    const userName = parseBoundedName(req.body?.userName, 50)

    if (!user || !token) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid invitation request"
        )
    }
    if (!userName) {
        return sendFailure(
            res,
            400,
            "VALIDATION_ERROR",
            "Invalid display name"
        )
    }

    try {
        const invite = await isValidInvite(token)
        if (!invite.isValid) {
            const status = invite.reason === "expired" ? 410 : 404
            return sendFailure(
                res,
                status,
                invite.reason === "expired"
                    ? "INVITE_EXPIRED"
                    : "INVITE_NOT_FOUND",
                invite.reason === "expired"
                    ? "Invitation expired"
                    : "Invitation not found"
            )
        }

        const { groupId } = invite
        if (await isUserAuthorised(user, groupId)) {
            return sendFailure(
                res,
                409,
                "ALREADY_MEMBER",
                "User already in group"
            )
        }

        await database.query(
            'INSERT INTO group_members (group_id, user_id, user_group_name) VALUES ($1,$2, $3)',
            [groupId, user, userName]
        )

        return sendSuccess(res, 200, { groupId })
    } catch (error) {
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
        ) {
            logger.warn("group_join_conflict", {
                operation: "join_group"
            }, error)
            return sendFailure(
                res,
                409,
                "ALREADY_MEMBER",
                "User already in group"
            )
        }

        logger.error("group_join_failed", {
            operation: "join_group"
        }, error)

        return sendFailure(
            res,
            500,
            "INTERNAL_ERROR",
            "Server unable to join group"
        )
    }

}
