/** Wraps a promise so it rejects after `ms` instead of hanging forever.
 *  Guards media-load promises — the scenify image loader has no onerror and
 *  can hang indefinitely on a failed/blocked asset. */
export function promiseWithTimeout<T>(p: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    p.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
