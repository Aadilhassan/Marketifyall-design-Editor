type Callback = (data?: unknown) => void

export class EventBus {
  private listeners: Map<string, Set<Callback>> = new Map()

  on(event: string, callback: Callback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data) } catch (e) { console.error(`[mfa] Event handler error (${event}):`, e) }
    })
  }

  off(event: string, callback?: Callback): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback)
    } else {
      this.listeners.delete(event)
    }
  }

  removeAll(): void {
    this.listeners.clear()
  }
}
