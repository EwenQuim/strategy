import { buttonClassName, iconButtonClassName } from '../components/styles'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Icon, PawnIcon } from '../components/Icon'
import { BOT_LEVELS, type BotDifficulty } from '../lib/engine/ai'
import {
  BIOMES,
  MAP_WIDTH,
  PAWN_CLASSES,
  RECRUIT_CLASSES,
  type Biome,
  type Pawn,
} from '../lib/engine'
import type { GameMode } from '../lib/game-mode'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'

const recruits = RECRUIT_CLASSES.map((Unit) => new Unit(0, 0, 0, 'player'))

export const Route = createFileRoute('/custom')({
  component: function CustomPlay() {
    const navigate = Route.useNavigate()
    const [mode, setMode] = useState<GameMode>('ai')
    const [difficulty, setDifficulty] = useState<BotDifficulty>('normal')
    const [biome, setBiome] = useState<Biome>('verdant')
    const [player, setPlayer] = useState<Pawn['kind'][]>([
      'king',
      'swordsman',
      'archer',
      'magician',
      'ninja',
    ])
    const [enemy, setEnemy] = useState<Pawn['kind'][] | null>(null)
    const enemyRoster = enemy ?? player
    const labels = mode === 'local' ? m.localSides : m.aiSides

    return (
      <main className="m-auto flex h-dvh max-w-[520px] flex-col gap-4 pt-[max(12px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-1 [&_input:focus-visible]:outline-gold [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-1 [&_select:focus-visible]:outline-gold [&_:disabled]:opacity-50">
        <header className="flex items-center justify-between gap-3">
          <h1 className="mt-1 font-serif text-3xl leading-[normal]">{common.customPlay}</h1>
          <Link to="/" className={iconButtonClassName} aria-label={common.backToHome}>
            <Icon name="close" />
          </Link>
        </header>
        <form
          className="flex min-h-0 flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void navigate({
              to: '/game',
              search: { mode, difficulty, setup: { biome, player, enemy: enemyRoster } },
            })
          }}
        >
          <div className="min-h-0 overflow-y-auto p-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 text-xs text-muted">
                <label htmlFor="custom-mode">{m.mode}</label>
                <select
                  className="w-full min-w-0 min-h-11 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-base text-ink [color-scheme:dark]"
                  id="custom-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as GameMode)}
                >
                  <option value="ai">{common.quickPlay}</option>
                  <option value="local">{m.twoPlayers}</option>
                </select>
              </div>
              <div className="grid gap-1.5 text-xs text-muted">
                <label htmlFor="custom-difficulty">
                  {m.difficulty}
                  {mode === 'local' && m.aiOnly}
                </label>
                <select
                  className="w-full min-w-0 min-h-11 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-base text-ink [color-scheme:dark]"
                  id="custom-difficulty"
                  value={difficulty}
                  disabled={mode === 'local'}
                  onChange={(event) => setDifficulty(event.target.value as BotDifficulty)}
                >
                  {Object.keys(BOT_LEVELS).map((level) => (
                    <option key={level} value={level}>
                      {m.difficulties[level as BotDifficulty]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 text-xs text-muted col-span-full">
                <label htmlFor="custom-biome">{m.biome}</label>
                <select
                  className="w-full min-w-0 min-h-11 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-base text-ink [color-scheme:dark]"
                  id="custom-biome"
                  value={biome}
                  onChange={(event) => setBiome(event.target.value as Biome)}
                >
                  {Object.entries(BIOMES).map(([value, biome]) => (
                    <option key={value} value={value}>
                      {biome.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-xs">
              <input
                className="size-[18px] accent-gold"
                type="checkbox"
                checked={enemy === null}
                onChange={(event) => setEnemy(event.target.checked ? null : [...player])}
              />
              {m.mirrorRoster}
            </label>
            <table className="w-full border-separate border-spacing-2 text-sm [&_svg]:size-[18px] [&_svg]:text-gold [&_tfoot_th]:py-2 [&_tfoot_td]:py-2">
              <caption className="text-left font-semibold text-gold">{m.rosters}</caption>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium" scope="col">
                    {m.unit}
                  </th>
                  <th className="font-medium w-1/4 text-center" scope="col">
                    {labels[0]}
                  </th>
                  <th className="font-medium w-1/4 text-center" scope="col">
                    {labels[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="text-left font-medium" scope="row">
                    <span className="flex items-center gap-2 capitalize">
                      <PawnIcon kind="king" />
                      {m.king}
                    </span>
                  </th>
                  <td className="w-1/4 text-center">1</td>
                  <td className="w-1/4 text-center">1</td>
                </tr>
                {recruits.map(({ kind }) => (
                  <tr key={kind}>
                    <th className="text-left font-medium" scope="row">
                      <span className="flex items-center gap-2 capitalize">
                        <PawnIcon kind={kind} />
                        {kind}
                      </span>
                    </th>
                    {[player, enemyRoster].map((roster, side) => {
                      const count = roster.filter((unit) => unit === kind).length
                      const max = Math.min(
                        MAP_WIDTH * 3 - roster.length + count,
                        side === 0 && PAWN_CLASSES[kind].startsOnFrontRow
                          ? MAP_WIDTH
                          : MAP_WIDTH * 3 - 1,
                      )
                      return (
                        <td className="w-1/4 text-center" key={side}>
                          <input
                            className="w-full min-w-0 min-h-11 rounded-md border border-line bg-[#20362b] p-2 font-[inherit] text-base text-ink [color-scheme:dark] text-center"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={max}
                            step={1}
                            value={count}
                            aria-label={labels[side] + ' ' + kind}
                            disabled={side === 1 && enemy === null}
                            onChange={(event) => {
                              const value = Number(event.target.value)
                              if (!Number.isInteger(value) || value < 0 || value > max) return
                              const next = [
                                ...roster.filter((unit) => unit !== kind),
                                ...Array<Pawn['kind']>(value).fill(kind),
                              ]
                              if (side === 0) setPlayer(next)
                              else setEnemy(next)
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-xs text-muted">
                <tr>
                  <th className="text-left font-medium" scope="row">
                    {m.total}
                  </th>
                  <td className="w-1/4 text-center">{player.length}</td>
                  <td className="w-1/4 text-center">{enemyRoster.length}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs leading-[1.5] text-muted">
              {m.rosterLimits(MAP_WIDTH * 3, MAP_WIDTH)}
            </p>
          </div>
          <button
            type="submit"
            className={
              buttonClassName +
              ' min-h-13 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3] mt-auto shrink-0'
            }
          >
            {m.startBattle}
            <Icon name="arrow" />
          </button>
        </form>
      </main>
    )
  },
})
