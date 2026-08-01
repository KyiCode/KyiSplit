import { vi } from 'vitest'

type JsonBody = object | readonly unknown[]

export function jsonResponse(
  body: JsonBody,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function successResponse<T>(data: T, status = 200): Response {
  return jsonResponse({ status: 'success', data }, status)
}

export function failureResponse(
  message: string,
  status: number,
  code = 'INTERNAL_ERROR',
): Response {
  return jsonResponse({ status: 'fail', code, message }, status)
}

export function installFetchQueue(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    if (response instanceof Error) {
      fetchMock.mockRejectedValueOnce(response)
    } else {
      fetchMock.mockResolvedValueOnce(response)
    }
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
