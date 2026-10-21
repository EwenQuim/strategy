import { menuCardClassName, menuInputClassName } from '../components/styles'
import { Button } from '../components/Button'
import { MenuLayout } from '../components/MenuLayout'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Icon, PawnIcon } from '../components/Icon'
import { ParticipantPanel } from '../components/ParticipantPanel'
import { RosterStepper } from '../components/RosterStepper'
import { defaultParticipant, participantBot } from '../bots/participants'
import {
  BIOMES,
  MAP_WIDTH,
  RECRUIT_CLASSES,
  randomArmy,
  type Biome,
  type Pawn,
} from '../lib/engine'
import {
  readDeveloperPreview,
  readSymmetricPreference,
  saveSymmetricPreference,
} from '../preferences'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import { unitNames } from '../i18n/units'
import { biomeNames } from '../i18n/biomes'

const recruits = RECRUIT_CLASSES.map((Unit) => new Unit(0, 0, 0, 'player'))

// The default roster rolls fresh on every visit, like quick play, so players
// start from a new random army instead of editing their way to one.
const randomDefaultRoster = () =>
  randomArmy({ next: Math.random }).map((Unit) => new Unit(0, 0, 0, 'player').kind)

export const Route = createFileRoute('/custom')({
  component: function CustomPlay() {
    const navigate = Route.useNavigate()
    const [playerController, setPlayerController] = useState(() => defaultParticipant('human'))
    const [enemyController, setEnemyController] = useState(() => defaultParticipant('bot'))
    const [biome, setBiome] = useState<Biome>('verdant')
    const [symmetric, setSymmetric] = useState(readSymmetricPreference)
    const [developerPreview] = useState(readDeveloperPreview)
    const [player, setPlayer] = useState<Pawn['kind'][]>(randomDefaultRoster)
    const [enemy, setEnemy] = useState<Pawn['kind'][] | null>(null)
    const enemyRoster = enemy ?? player
    const labels = m.localSides
    let sideBots
    try {
      sideBots = {
        player: participantBot(playerController),
        enemy: participantBot(enemyController),
      }
    } catch {
      sideBots = undefined
    }

    return (
      <MenuLayout title={common.customPlay} scroll={false}>
        <form
          className="flex min-h-0 w-full max-w-[600px] flex-1 flex-col gap-3 self-center"
          onSubmit={(event) => {
            event.preventDefault()
            if (!sideBots) return
            void navigate({
              to: '/game',
              search: {
                mode: playerController.human && !enemyController.human ? 'ai' : 'local',
                bot: sideBots.enemy ?? undefined,
                sideBots,
                setup: { biome, player, enemy: enemyRoster },
              },
            })
          }}
        >
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
            <ParticipantPanel
              side={0}
              participant={playerController}
              onChange={setPlayerController}
              developerPreview={developerPreview}
              collapsed
            />
            <ParticipantPanel
              side={1}
              participant={enemyController}
              onChange={setEnemyController}
              developerPreview={developerPreview}
            />
            <section
              className={menuCardClassName + ' shrink-0 p-3 min-[900px]:p-5'}
              aria-labelledby="custom-config"
            >
              <h2 id="custom-config" className="mb-3 font-semibold text-gold">
                {m.gameConfig}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5 text-sm text-muted col-span-full">
                  <label htmlFor="custom-biome">{m.biome}</label>
                  <select
                    className={menuInputClassName}
                    id="custom-biome"
                    value={biome}
                    onChange={(event) => setBiome(event.target.value as Biome)}
                  >
                    {Object.entries(BIOMES).map(([value]) => (
                      <option key={value} value={value}>
                        {biomeNames[value as Biome]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  className="size-[18px] accent-gold"
                  type="checkbox"
                  checked={enemy === null}
                  onChange={(event) => setEnemy(event.target.checked ? null : [...player])}
                />
                {m.mirrorRoster}
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  className="size-[18px] accent-gold"
                  type="checkbox"
                  checked={symmetric}
                  onChange={(event) => {
                    setSymmetric(event.target.checked)
                    saveSymmetricPreference(event.target.checked)
                  }}
                />
                {m.symmetricMap}
              </label>
              <table className="mt-3 w-full border-separate border-spacing-2 text-[13px] min-[900px]:text-base [&_svg]:size-[18px] [&_svg]:text-gold [&_tfoot_th]:py-2 [&_tfoot_td]:py-2">
                <caption className="text-left font-semibold text-gold">{m.rosters}</caption>
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="text-left font-medium" scope="col">
                      {m.unit}
                    </th>
                    <th className="font-medium w-[30%] text-center" scope="col">
                      {labels[0]}
                    </th>
                    <th className="font-medium w-[30%] text-center" scope="col">
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
                    <td className="w-[30%] text-center">1</td>
                    <td className="w-[30%] text-center">1</td>
                  </tr>
                  {recruits.map(({ kind }) => (
                    <tr key={kind}>
                      <th className="text-left font-medium" scope="row">
                        <span className="flex items-center gap-2 capitalize">
                          <PawnIcon kind={kind} />
                          {unitNames[kind]}
                        </span>
                      </th>
                      {[player, enemyRoster].map((roster, side) => {
                        const count = roster.filter((unit) => unit === kind).length
                        const max = Math.min(
                          MAP_WIDTH * 3 - roster.length + count,
                          MAP_WIDTH * 3 - 1,
                        )
                        return (
                          <td className="w-[30%] text-center" key={side}>
                            <RosterStepper
                              count={count}
                              max={max}
                              label={labels[side] + ' ' + unitNames[kind]}
                              disabled={side === 1 && enemy === null}
                              onChange={(value) => {
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
                    <td className="w-[30%] text-center">{player.length}</td>
                    <td className="w-[30%] text-center">{enemyRoster.length}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="text-xs leading-[1.5] text-muted">
                {m.rosterLimits(MAP_WIDTH * 3)}
              </p>
            </section>
          </div>
          <Button type="submit" disabled={!sideBots} variant="primary" className="mt-auto">
            {m.startBattle}
            <Icon name="arrow" />
          </Button>
        </form>
      </MenuLayout>
    )
  },
})
