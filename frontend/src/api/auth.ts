const BASE_URL = import.meta.env.VITE_BASE_URL;

export async function signUp(email: string, password: string) {
    const lowerEmail = email.toLowerCase
    const response = await fetch(`${BASE_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lowerEmail, password })
    })
    return response.json()
}

export async function logIn(email: string, password: string) {
    const lowerEmail = email.toLowerCase
    const res = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lowerEmail, password })
    })
    return res.json()
}