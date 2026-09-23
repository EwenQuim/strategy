export class ApiError<TErr = unknown> extends Error {
  readonly status: number
  readonly body: TErr

  constructor(status: number, body: TErr) {
    super('API error ' + status)
    this.status = status
    this.body = body
  }
}

export type ErrorType<TErr> = ApiError<TErr>

export type ClientOptions = {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: Record<string, unknown>
  data?: unknown
  signal?: AbortSignal
} & Omit<RequestInit, 'body' | 'method'>

export const client = async <T>(options: ClientOptions): Promise<T> => {
  const { url, method, params, data, signal, headers, ...init } = options
  const search = params ? '?' + new URLSearchParams(stringifyParams(params)) : ''
  const response = await fetch(url + search, {
    ...init,
    method,
    signal,
    headers: {
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  if (!response.ok) throw new ApiError(response.status, await parseBody(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const stringifyParams = (params: Record<string, unknown>): string[][] =>
  Object.entries(params).flatMap(([key, value]) =>
    value === undefined || value === null
      ? []
      : Array.isArray(value)
        ? value.map((item) => [key, String(item)])
        : [[key, String(value)]],
  )

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}
