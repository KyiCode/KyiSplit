import crypto from "crypto"
import database from "../db"

export async function generateInvite(groupId: string, userId: string) {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await database.query(
        `INSERT INTO invites (group_id, token, created_by, expires_at)
     VALUES ($1, $2, $3, $4)`,
        [groupId, token, userId, expiresAt]
    )
    const inviteLink = `${process.env.FRONTEND_URL}/join/${token}`
    return inviteLink
}