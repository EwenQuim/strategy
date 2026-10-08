// Runtime performance benchmark for the game screen.
//
// Builds the client, serves dist/ on a local port, and drives a headless Chrome
// with mobile emulation and CPU throttling, then reports:
//   - load: navigation until the first player turn is ready
//   - idle: rendering work while the screen is static (the regression gate)
//   - move tap: main-thread long tasks for one player move
//   - bot turns: wall time and main-thread long tasks per enemy turn
//
// Usage:
//   node scripts/bench-web.ts [--json] [--no-build]
//   THROTTLE=6 SEED=perfprobe1 DIFFICULTY=normal TURNS=5 node scripts/bench-web.ts
//
// The idle paint budget fails the run when anything animates without
// compositing on a static screen: the active-pawn halo once repainted the whole
// board SVG at refresh rate because its keyframes animated stroke-opacity and
// fill-opacity instead of opacity (see halo-breathe in src/index.css).

import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type CDPSession, type Page } from 'playwright-core'

const PORT = 4199
const BASE = `http://127.0.0.1:${PORT}/strategy/`
const SEED = process.env.SEED ?? 'perfprobe1'
const DIFFICULTY = process.env.DIFFICULTY ?? 'normal'
const THROTTLE = Number(process.env.THROTTLE ?? 6)
const TURNS = Number(process.env.TURNS ?? 5)
const IDLE_WINDOW_MS = 3000
// A static screen must not repaint. The budget tolerates a few stray paints but
// fails on a repaint loop, which shows up as one paint per frame (~180 here).
const IDLE_PAINT_BUDGET = 6

type TraceEvent = { name: string; ph: string; dur?: number }

type FrameStats = {
  frames: number
  meanMs: number
  p95Ms: number
  maxMs: number
  over22: number
}

type IdleStats = FrameStats & { paints: number; rasterTasks: number; layoutTrees: number }

type BotTurn = { wallMs: number; taskTotalMs: number; worstTaskMs: number }

type Report = {
  throttle: number
  seed: string
  difficulty: string
  loadMs: number
  idle: IdleStats
  moveTapTasksMs: number[]
  botTurns: BotTurn[]
}

const runCommand = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    )
  })

async function startPreview(): Promise<ChildProcess> {
  const server = spawn(
    'npm',
    ['run', 'preview', '--', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      stdio: 'ignore',
    },
  )
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return server
    } catch {
      // Server not up yet.
    }
    await delay(500)
  }
  server.kill()
  throw new Error(`Preview server did not come up on port ${PORT}`)
}

const waitForOurTurn = (page: Page) =>
  page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>('[data-action="endTurn"]')?.disabled,
    undefined,
    { timeout: 60_000 },
  )

async function trace<Measured>(
  cdp: CDPSession,
  measure: () => Promise<Measured>,
): Promise<{ result: Measured; events: TraceEvent[] }> {
  const events: TraceEvent[] = []
  const collect = (chunk: { value?: { [key: string]: unknown }[] }) => {
    events.push(...(chunk.value as TraceEvent[]))
  }
  const done = new Promise<void>((resolve) =>
    cdp.once('Tracing.tracingComplete', () => resolve()),
  )
  cdp.on('Tracing.dataCollected', collect)
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    categories: 'devtools.timeline,disabled-by-default-devtools.timeline',
  })
  const result = await measure()
  await cdp.send('Tracing.end')
  await done
  cdp.off('Tracing.dataCollected', collect)
  return { result, events }
}

const countEvents = (events: TraceEvent[], name: string) =>
  events.filter((event) => event.name === name).length

async function measureIdle(page: Page, cdp: CDPSession): Promise<IdleStats> {
  const { result, events } = await trace(cdp, () =>
    page.evaluate(
      (windowMs) =>
        new Promise<FrameStats>((resolve) => {
          const deltas: number[] = []
          let last = performance.now()
          const start = last
          const tick = (now: number) => {
            deltas.push(now - last)
            last = now
            if (now - start < windowMs) requestAnimationFrame(tick)
            else {
              deltas.sort((a, b) => a - b)
              const percentile = (p: number) =>
                deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * p))]
              resolve({
                frames: deltas.length,
                meanMs: deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length,
                p95Ms: percentile(0.95),
                maxMs: deltas[deltas.length - 1],
                over22: deltas.filter((delta) => delta > 22).length,
              })
            }
          }
          requestAnimationFrame(tick)
        }),
      IDLE_WINDOW_MS,
    ),
  )
  return {
    ...result,
    paints: countEvents(events, 'Paint'),
    rasterTasks: countEvents(events, 'RasterTask'),
    layoutTrees: countEvents(events, 'UpdateLayoutTree'),
  }
}

type LongTaskWindow = Window & { __longTasks?: number[] }

async function measureMoveTap(page: Page): Promise<number[]> {
  await page.evaluate(() => {
    const win = window as LongTaskWindow
    win.__longTasks = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) win.__longTasks?.push(entry.duration)
    }).observe({ entryTypes: ['longtask'] })
  })
  await page.click('[data-testid="hex-tile"][role="button"]')
  await page.waitForTimeout(2000)
  return page.evaluate(() => (window as LongTaskWindow).__longTasks ?? [])
}

async function measureBotTurn(page: Page): Promise<BotTurn | null> {
  const endTurn = page.locator('[data-action="endTurn"]')
  if (!(await endTurn.count()) || (await endTurn.isDisabled())) return null
  await page.evaluate(() => {
    ;(window as LongTaskWindow).__longTasks = []
  })
  const started = Date.now()
  await endTurn.click()
  await waitForOurTurn(page)
  const tasks = await page.evaluate(() => (window as LongTaskWindow).__longTasks ?? [])
  return {
    wallMs: Date.now() - started,
    taskTotalMs: tasks.reduce((sum, task) => sum + task, 0),
    worstTaskMs: tasks.length ? Math.max(...tasks) : 0,
  }
}

async function runBenchmarks(): Promise<Report> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })

    const loadedAt = Date.now()
    await page.goto(`${BASE}game/${SEED}?mode=ai&difficulty=${DIFFICULTY}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForSelector('[data-testid="battlefield"]')
    await page.evaluate(() =>
      document.querySelector<HTMLDialogElement>('dialog[open]')?.close(),
    )
    await waitForOurTurn(page)
    const loadMs = Date.now() - loadedAt

    await page.waitForTimeout(400)
    const idle = await measureIdle(page, cdp)
    const moveTapTasksMs = await measureMoveTap(page)
    const botTurns: BotTurn[] = []
    for (let turn = 0; turn < TURNS; turn++) {
      const measured = await measureBotTurn(page)
      if (!measured) break
      botTurns.push(measured)
      await page.waitForTimeout(200)
    }
    return {
      throttle: THROTTLE,
      seed: SEED,
      difficulty: DIFFICULTY,
      loadMs,
      idle,
      moveTapTasksMs,
      botTurns,
    }
  } finally {
    await browser.close()
  }
}

const round = (value: number) => Math.round(value)

function printReport(report: Report) {
  console.log(
    `\nbench-web  seed=${report.seed}  difficulty=${report.difficulty}  throttle=${report.throttle}x`,
  )
  console.log(`load until first player turn: ${report.loadMs} ms`)
  console.log(
    `idle ${IDLE_WINDOW_MS}ms: ${report.idle.frames} frames, mean ${round(report.idle.meanMs)}ms, p95 ${round(report.idle.p95Ms)}ms, >22ms ${report.idle.over22}`,
  )
  console.log(
    `idle paints ${report.idle.paints}, raster tasks ${report.idle.rasterTasks}, layout trees ${report.idle.layoutTrees} (budget: ${IDLE_PAINT_BUDGET} paints)`,
  )
  console.log(
    `move tap long tasks: ${report.moveTapTasksMs.map(round).join(' + ') || 'none'} ms`,
  )
  for (const turn of report.botTurns)
    console.log(
      `bot turn: wall ${turn.wallMs} ms, long tasks ${round(turn.taskTotalMs)} ms, worst ${round(turn.worstTaskMs)} ms`,
    )
}

async function main() {
  if (!process.argv.includes('--no-build')) await runCommand('npm', ['run', 'build'])
  const server = await startPreview()
  try {
    const report = await runBenchmarks()
    if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
    else printReport(report)
    if (report.idle.paints > IDLE_PAINT_BUDGET) {
      console.error(
        `\nFAIL: ${report.idle.paints} paints while idle (budget ${IDLE_PAINT_BUDGET}). ` +
          'Something animates on the main thread instead of the compositor.',
      )
      process.exitCode = 1
    }
  } finally {
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
