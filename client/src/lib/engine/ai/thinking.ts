// Work that pauses at each yield, so the caller decides when to hand the thread back.
export type Thinking<T> = Generator<void, T, void>

export function finish<T>(thinking: Thinking<T>): T {
  for (;;) {
    const step = thinking.next()
    if (step.done) return step.value
  }
}

export function* mapPausing<T, R>(items: Iterable<T>, map: (item: T) => R): Thinking<R[]> {
  const results: R[] = []
  for (const item of items) {
    results.push(map(item))
    yield
  }
  return results
}
