const URL = import.meta.env.VITE_BASE_URL;

export async function signUp(email: string, password: string) {
    const response = await fetch(`${URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    return response.json()
}