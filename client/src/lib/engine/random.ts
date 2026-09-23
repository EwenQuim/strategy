export function seedState(seed: string): number {
  let value = 2166136261
  for (let i = 0; i < seed.length; i++) value = Math.imul(value ^ seed.charCodeAt(i), 16777619)
  return value >>> 0
}

export class SeededRandom {
  state: number

  constructor(state: number) {
    this.state = state >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let value = Math.imul(this.state ^ (this.state >>> 15), this.state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
