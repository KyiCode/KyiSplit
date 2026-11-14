import { apiRequest } from "./client"
import type {
    CredentialsRequest,
    LoginData,
    MessageData,
    SignupRequest,
    SessionData
} from "../../../backend/src/contracts/api"

export async function signUp(username: string, password: string, token: string) {
    const body: SignupRequest = { username, password, token }
    return apiRequest<MessageData>("/api/users/signup", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
}

export async function logIn(username: string, password: string) {
    const body: CredentialsRequest = { username, password }
    return apiRequest<LoginData>("/api/users/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
}

export async function verifySession() {
    return apiRequest<SessionData>("/api/users/verifysession")
}

export async function logOut() {
    return apiRequest<Record<string, never>>("/api/users/logout", {
        method: "POST"
    })
}
