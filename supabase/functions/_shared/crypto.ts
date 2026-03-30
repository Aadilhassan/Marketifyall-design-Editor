/**
 * Crypto utilities for API key hashing
 * Uses SHA-256 (not bcrypt) for API keys -- they have high entropy
 * and need fast, deterministic lookup per spec Section 11.1
 */

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes).map(b => b.toString(36)).join('')
  const key = `mfa_${raw}`
  const prefix = key.substring(0, 12)
  return { key, prefix }
}
