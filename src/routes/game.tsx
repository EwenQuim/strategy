import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
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

  const [events, setEvents] = useState<{ id: number; text: string }[]>([])
  const prevLog = useRef<string[]>([])
  const nextEventId = useRef(0)
  useEffect(() => {
    const prev = prevLog.current
    prevLog.current = state.log
    let kept = 0
    while (kept < prev.length && kept < state.log.length && prev[kept] === state.log[kept]) kept++
    const added = state.log.slice(kept).map((text) => ({ id: nextEventId.current++, text }))
    if (!added.length) return
    const ids = added.map((e) => e.id)
    setEvents((list) => [...list, ...added].slice(-3))
    setTimeout(() => setEvents((list) => list.filter((e) => !ids.includes(e.id))), 5000)
  }, [state.log])

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
  const pad = SIZE * 1.4
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const viewBox = `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`

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

      <div className="relative flex min-h-0 flex-1 justify-center">
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          {events.map((e) => (
            <div key={e.id} className="toast rounded bg-neutral-800/90 px-3 py-1 text-xs shadow-lg">
              {e.text}
            </div>
          ))}
        </div>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full max-w-2xl touch-manipulation select-none"
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
  const r = SIZE * (pawn.kind === 'king' ? 0.5 : 0.42)
  return (
    <g
      className="pointer-events-none"
      style={{
        transform: `translate(${hexX(pawn.q, pawn.r)}px, ${hexY(pawn.q, pawn.r)}px)`,
        transition: 'transform 350ms ease-in-out',
      }}
    >
      {active && (
        <circle r={r + 7} fill="none" stroke="#ffe066" strokeWidth={2} className="animate-pulse" />
      )}
      <circle
        r={r}
        fill={pawn.side === 'player' ? '#2b6cb0' : '#b03a3a'}
        stroke={active ? '#ffe066' : '#fff'}
        strokeWidth={active ? 4 : 2}
        strokeDasharray={pawn.defending ? '5 3' : undefined}
      />
      <text y={5} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#fff">
        {LETTER[pawn.kind]}
      </text>
      <text y={r + 10} textAnchor="middle" fontSize={9} fill="#fff">
        {pawn.hp} hp
      </text>
    </g>
  )
}
