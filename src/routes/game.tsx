import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useReducer } from 'react'
import {
  activePawn,
  ATTACK_RANGE,
  hexDist,
  initialState,
  reducer,
  reachable,
  START_ENERGY,
  START_HP,
  type Pawn,
  type Tile,
} from '../lib/engine'

export const Route = createFileRoute('/game')({
  component: Game,
})

const SIZE = 34
const hexX = (q: number, r: number) => SIZE * Math.sqrt(3) * (q + r / 2)
const hexY = (_q: number, r: number) => SIZE * 1.5 * r
const hexPoints = (cx: number, cy: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${cx + SIZE * 0.95 * Math.cos(a)},${cy + SIZE * 0.95 * Math.sin(a)}`
  }).join(' ')

const TERRAIN_COLOR = { plain: '#a3c07f', forest: '#4e7a3d', mountain: '#8a8a8a' }
const MOVE_COLOR = '#9bd1f0'
const ATTACK_COLOR = '#e8a3a3'
const LETTER = { king: 'K', swordsman: 'S' }

function Game() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const pawn = activePawn(state)
  const myTurn = !!pawn && pawn.side === 'player' && !state.winner

  const reach = useMemo(() => {
    if (!myTurn || pawn!.energy <= 0 || state.phase !== 'move') return new Map<string, number>()
    const occupied = new Set(state.pawns.filter((p) => p.id !== pawn!.id).map((p) => `${p.q},${p.r}`))
    return reachable(state.tiles, occupied, pawn!, pawn!.energy)
  }, [state.pawns, state.tiles, state.phase, myTurn, pawn])

  const attacking = state.phase === 'attack' && myTurn

  const tileFill = (tile: Tile) => {
    const k = `${tile.q},${tile.r}`
    if (attacking && pawn && k !== `${pawn.q},${pawn.r}` && hexDist(pawn, tile) <= ATTACK_RANGE)
      return ATTACK_COLOR
    if (reach.has(k)) return MOVE_COLOR
    return TERRAIN_COLOR[tile.terrain]
  }

  const onTileClick = (tile: Tile) => {
    if (attacking && pawn && hexDist(pawn, tile) <= ATTACK_RANGE)
      return dispatch({ type: 'attackAt', q: tile.q, r: tile.r })
    if (myTurn && reach.has(`${tile.q},${tile.r}`))
      return dispatch({ type: 'move', q: tile.q, r: tile.r })
  }

  const xs = [...state.tiles.values()].map((t) => hexX(t.q, t.r))
  const ys = [...state.tiles.values()].map((t) => hexY(t.q, t.r))
  const pad = SIZE * 1.1
  const viewBox = [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) + pad,
    Math.max(...ys) + pad,
  ].join(' ')

  return (
    <div className="flex h-[calc(100dvh-2.25rem)] flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-neutral-800 p-2 text-sm">
        <h1 className="font-bold">Hex Strategy</h1>
        {state.winner ? (
          <p className="font-bold text-yellow-300">{state.winner === 'player' ? 'Victory!' : 'Defeat.'}</p>
        ) : (
          pawn && (
            <p>
              {pawn.side === 'player' ? 'Your' : 'Enemy'} {pawn.kind}: {pawn.hp}/{START_HP} hp,{' '}
              {pawn.energy}/{START_ENERGY} energy
            </p>
          )
        )}
        <p className="ml-auto max-w-45 truncate text-xs text-neutral-400">{state.log.at(-1)}</p>
      </header>

      <div className="flex min-h-0 flex-1 justify-center">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full max-w-2xl touch-manipulation select-none"
        >
          {[...state.tiles.values()].map((tile) => (
            <polygon
              key={`${tile.q},${tile.r}`}
              className="cursor-pointer"
              points={hexPoints(hexX(tile.q, tile.r), hexY(tile.q, tile.r))}
              fill={tileFill(tile)}
              onClick={() => onTileClick(tile)}
            />
          ))}
          {state.pawns.map((p) => (
            <PawnChip key={p.id} pawn={p} active={pawn?.id === p.id} />
          ))}
        </svg>
      </div>

      <footer className="flex flex-wrap items-center gap-2 bg-neutral-800 p-2">
        {attacking ? (
          <>
            <p className="mr-2 text-sm">Choose a target (range {ATTACK_RANGE})</p>
            <button
              onClick={() => dispatch({ type: 'cancelAttack' })}
              className="min-h-11 rounded bg-neutral-700 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => dispatch({ type: 'act', action: 'attack' })}
              disabled={!myTurn || pawn!.energy <= 0}
              className="min-h-11 rounded bg-red-800 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Attack
            </button>
            <button
              onClick={() => dispatch({ type: 'act', action: 'defense' })}
              disabled={!myTurn || pawn!.energy <= 0}
              className="min-h-11 rounded bg-sky-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Defense
            </button>
            <button
              onClick={() => dispatch({ type: 'act', action: 'special' })}
              disabled={!myTurn || pawn!.energy <= 0}
              className="min-h-11 rounded bg-purple-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Special
            </button>
          </>
        )}
        <button
          onClick={() => dispatch({ type: 'endTurn' })}
          disabled={!myTurn}
          className="ml-auto min-h-11 rounded bg-neutral-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          End turn
        </button>
        <Link to="/" className="px-2 py-2 text-sm text-sky-400">
          Home
        </Link>
      </footer>
    </div>
  )
}

function PawnChip({ pawn, active }: { pawn: Pawn; active: boolean }) {
  const x = hexX(pawn.q, pawn.r)
  const y = hexY(pawn.q, pawn.r)
  const r = SIZE * (pawn.kind === 'king' ? 0.5 : 0.42)
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={pawn.side === 'player' ? '#2b6cb0' : '#b03a3a'}
        stroke={active ? '#ffe066' : '#fff'}
        strokeWidth={active ? 4 : 2}
        strokeDasharray={pawn.defending ? '5 3' : undefined}
      />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#fff">
        {LETTER[pawn.kind]}
      </text>
      <text x={x} y={y + r + 10} textAnchor="middle" fontSize={9} fill="#fff">
        {pawn.hp} hp
      </text>
    </g>
  )
}
