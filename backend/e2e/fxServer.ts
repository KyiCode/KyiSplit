import http from 'node:http'

const RATES: Record<string, number> = {
    'SGD/USD': 0.74,
    'USD/SGD': 1.35
}

interface FxServerOptions {
    expireInvite?: (token: string) => Promise<boolean>
}

export async function startFxServer(
    port: number,
    options: FxServerOptions = {}
) {
    let failNextQuote = false
    const server = http.createServer(async (request, response) => {
        if (
            request.method === 'POST' &&
            request.url === '/__e2e/fx/fail-next'
        ) {
            failNextQuote = true
            response.statusCode = 204
            response.end()
            return
        }

        const expireMatch = request.url?.match(
            /^\/__e2e\/invites\/([0-9a-f]{64})\/expire$/
        )
        if (request.method === 'POST' && expireMatch && options.expireInvite) {
            try {
                const expired = await options.expireInvite(expireMatch[1])
                response.statusCode = expired ? 204 : 404
            } catch {
                response.statusCode = 500
            }
            response.end()
            return
        }

        const match = request.url?.match(/^\/v2\/rate\/([A-Z]{3})\/([A-Z]{3})$/)
        const rate = match ? RATES[`${match[1]}/${match[2]}`] : undefined
        response.setHeader('content-type', 'application/json')
        if (rate !== undefined && failNextQuote) {
            failNextQuote = false
            response.statusCode = 503
            response.end(JSON.stringify({ error: 'fixture provider failure' }))
            return
        }
        if (rate === undefined) {
            response.statusCode = 404
            response.end(JSON.stringify({ error: 'unsupported fixture rate' }))
            return
        }
        response.end(JSON.stringify({ rate, date: '2026-07-30' }))
    })
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', resolve)
    })
    return server
}
