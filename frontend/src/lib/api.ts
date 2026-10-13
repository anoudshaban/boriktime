const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'bt_admin_token'

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }

  /** First validation message, handy for toasts. */
  get firstError(): string {
    return Object.values(this.errors)[0]?.[0] ?? this.message
  }
}

export const auth = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set token(value: string | null) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage blocked: session lasts until reload */
    }
  },
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown }

export async function api<T>(path: string, { body, headers, ...init }: Options = {}): Promise<T> {
  const isForm = body instanceof FormData
  const token = auth.token

  const response = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) auth.token = null
    throw new ApiError(response.status, data.message ?? response.statusText, data.errors)
  }

  return data as T
}
