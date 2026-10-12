import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGNS,
  campaignBot,
  completeCampaignLevel,
  isLevelUnlocked,
  parseCampaignProgress,
  withUnitUnlocks,
  withBriefings,
  isCampaignUnlocked,
} from '../src/lib/campaign.ts'
import {
  initialState,
  activePawn,
  mapFromRows,
  passable,
  key,
  type PawnKind,
} from '../src/lib/engine/index.ts'
import { turnPlans } from '../src/lib/engine/ai/turns.ts'
import { getBot } from '../src/bots/catalog.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import original from '../src/lib/campaigns/001-original.json' with { type: 'json' }

test('All packs use authored, deterministic, compact maps and validated armies', () => {
  for (const pack of CAMPAIGNS) {
    assert.equal(new Set(pack.levels.map((level) => level.seed)).size, pack.levels.length)
    for (const [index, level] of pack.levels.entries()) {
      assert.equal(level.id, index + 1)
      assert.ok(level.setup.map.length <= 12 && level.setup.map.every((row) => row.length <= 8))
      const state = initialState(level.seed, level.setup)
      assert.deepEqual(state, initialState(level.seed, level.setup))
      assert.ok(state.pawns.every((p) => passable(state.tiles.get(key(p.q, p.r)))))
      assert.equal(state.pawns.length, level.setup.player.length + level.setup.enemy.length)
    }
  }
  assert.deepEqual(
    CAMPAIGNS[1].levels.map(
      ({ newElements: _newElements, unlocks: _unlocks, ...level }) => level,
    ),
    original,
  )
})

test('Each unfamiliar recruit debuts enemy-only, unlocks on victory and is playable next level', () => {
  for (const pack of CAMPAIGNS) {
    const available = new Set<PawnKind>(pack.startingUnits)
    for (const [index, level] of pack.levels.entries()) {
      for (const p of level.setup.player)
        assert.ok(available.has(p.kind), `${pack.slug}:${level.id} ${p.kind}`)
      for (const kind of level.unlocks) {
        const state = initialState(level.seed, level.setup, 'player')
        assert.equal(activePawn(state)?.side, 'player')
        assert.equal(activePawn(state)?.kind, 'king')
        const introductions = state.order.slice(1, 1 + level.setup.firstEnemyKinds!.length)
        assert.ok(
          introductions.some((id) => {
            const pawn = state.pawns.find((p) => p.id === id)
            return pawn?.side === 'enemy' && pawn.kind === kind
          }),
        )
        assert.ok(!available.has(kind))
        assert.ok(level.setup.enemy.some((p) => p.kind === kind))
        assert.ok(!level.setup.player.some((p) => p.kind === kind))
        if (pack.levels[index + 1])
          assert.ok(pack.levels[index + 1].setup.player.some((p) => p.kind === kind))
        available.add(kind)
      }
    }
  }
  assert.deepEqual(CAMPAIGNS[0].levels[0].unlocks, ['swordsman'])
  assert.deepEqual(
    CAMPAIGNS[1].levels.slice(0, 6).map((level) => level.unlocks),
    [['archer'], ['magician'], ['bulwark'], ['bomber'], ['ninja'], ['lancer']],
  )
  assert.deepEqual(CAMPAIGNS[5].levels[3].unlocks, ['wolf'])
  assert.deepEqual(CAMPAIGNS[6].levels[0].unlocks, ['hoplite'])
  assert.deepEqual(CAMPAIGNS[7].levels[0].unlocks, ['berserker'])
})

test('Every introduction allows a non-lethal player opening before the new enemy acts', () => {
  for (const pack of CAMPAIGNS) {
    for (const level of pack.levels.filter((level) => level.unlocks.length)) {
      const state = initialState(level.seed, level.setup, 'player')
      for (const { state: next } of turnPlans(state)) {
        const encounter = `${pack.slug}:${level.id}`
        assert.equal(next.winner, null, encounter)
        assert.equal(next.pawns.length, state.pawns.length, encounter)
        assert.equal(activePawn(next)?.side, 'enemy', encounter)
        assert.ok(level.unlocks.includes(activePawn(next)!.kind), encounter)
      }
    }
  }
})

test('Invalid authored unlock progressions are rejected rather than replacing units at runtime', () => {
  const level = CAMPAIGNS[1].levels[0]
  assert.throws(() => withUnitUnlocks([level], ['king']), /before its enemy introduction/)
  assert.throws(
    () => withUnitUnlocks([level, level], ['king', 'swordsman']),
    /newly unlocked archer/,
  )
})

test('Briefings remain global first appearances while unlocks are pack-local', () => {
  const levels = CAMPAIGNS[1].levels
  assert.ok(levels[5].newElements.includes('lancer'))
  assert.ok(CAMPAIGNS[2].levels.every((level) => level.newElements.length === 0))
  const result = withBriefings([[levels[0]], [levels[0]]])
  assert.ok(result[0][0].newElements.length > 0)
  assert.equal(result[1][0].newElements.length, 0)
})

test('Brutal uses depth four while other campaigns keep their difficulty presets', () => {
  for (const pack of CAMPAIGNS) {
    for (const level of pack.levels) {
      const bot = campaignBot(pack, level)
      const options = getBot(bot).options
      assert.deepEqual(options, {
        ...BOT_LEVELS[level.difficulty],
        ...(pack.slug === 'brutal' ? { depth: 4 } : {}),
      })
      assert.deepEqual(getBot(JSON.parse(JSON.stringify(bot))).options, options)
    }
  }
})

test('Original retains twenty encounters across five biomes and introduces Hellfire gently', () => {
  const levels = CAMPAIGNS[1].levels
  assert.equal(levels.length, 20)
  assert.deepEqual(
    levels.map((level) => level.setup.biome),
    ['verdant', 'mountains', 'desert', 'volcano', 'hell'].flatMap((b) => Array(4).fill(b)),
  )
  assert.deepEqual(
    levels.slice(16).map((level) => initialState(level.seed, level.setup).hellfire.length),
    [1, 2, 2, 2],
  )
  assert.ok(levels.slice(0, 2).every((level) => mapFromRows(level.setup.map).size <= 36))
})

test('Progress unlocks one level at a time, preserves existing saves and never regresses', () => {
  for (const pack of CAMPAIGNS) {
    let cleared: readonly number[] = []
    for (let id = 1; id <= pack.levels.length; id++) {
      assert.ok(isLevelUnlocked(pack, id, cleared, false))
      assert.equal(isLevelUnlocked(pack, id + 1, cleared, false), false)
      cleared = completeCampaignLevel(pack, cleared, id)
      assert.equal(completeCampaignLevel(pack, cleared, id), cleared)
      assert.deepEqual(
        parseCampaignProgress(JSON.stringify(cleared), pack.levels.length),
        cleared,
      )
    }
  }
  assert.deepEqual(parseCampaignProgress('3', 20), [1, 2, 3])
  for (const value of [null, 'bad', '[0]', '[21]', '["1"]'])
    assert.deepEqual(parseCampaignProgress(value, 20), [])
  assert.ok(isCampaignUnlocked(CAMPAIGNS[2], (slug) => (slug === 'original' ? 10 : 0)))
})
