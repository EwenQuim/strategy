export const SIZE = 34
export const hexX = (q: number, r: number) => SIZE * Math.sqrt(3) * (q + r / 2)
export const hexY = (r: number) => SIZE * 1.5 * r
export const hexPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30)
  return [SIZE * 0.95 * Math.cos(angle), SIZE * 0.95 * Math.sin(angle)].join(',')
}).join(' ')

export const terrainColors = {
  plain: 'var(--plain-tile, #7d8963)',
  forest: '#536e51',
  mountain: 'var(--mountain-tile, #737c69)',
  lake: '#4c7186',
  sand: '#e5bc70',
  palm: '#d5b774',
  basalt: 'var(--basalt-tile, #594e53)',
  lava: 'url(#lava-melt)',
}
