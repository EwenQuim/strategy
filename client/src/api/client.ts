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

export const client = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) throw new ApiError(response.status, await parseBody(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}
