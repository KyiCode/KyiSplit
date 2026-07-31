import crypto from "crypto"
import database from "../db"

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
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, "")
    if (!frontendUrl) {
        throw new Error("FRONTEND_URL must be configured")
    }

    const inviteLink = `${frontendUrl}/join/${token}`
    return inviteLink
}
