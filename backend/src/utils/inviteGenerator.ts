import crypto from "crypto"
import database from "../db"
import { readAppOrigin } from "../config"

export const INVITE_DURATION_MS = 60 * 60 * 1000

export async function generateInvite(
    groupId: string,
    userId: string,
    now = new Date()
) {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(now.getTime() + INVITE_DURATION_MS)

    await database.query(
        `INSERT INTO invites (group_id, token, created_by, expires_at)
     VALUES ($1, $2, $3, $4)`,
        [groupId, token, userId, expiresAt]
    )
    const inviteLink = `${readAppOrigin()}/join/${token}`
    return inviteLink
}
