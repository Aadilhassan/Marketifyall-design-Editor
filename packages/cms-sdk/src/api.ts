/**
 * Lightweight HTTP client for the Marketifyall API.
 * No external dependencies -- uses native fetch.
 */

export class ApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers as Record<string, string> || {}),
    }

    const response = await fetch(url, { ...options, headers })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }))
      const error: any = new Error(body.error || `HTTP ${response.status}`)
      error.status = response.status
      error.body = body
      throw error
    }

    return response.json()
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
