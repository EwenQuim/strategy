import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function checkScopes(paths: readonly string[]): { client: boolean; server: boolean } {
  const shared = paths.some((path) =>
    /^(Makefile|\.githooks\/|client\/scripts\/push-checks\.ts)/.test(path),
  )
  return {
    client: shared || paths.some((path) => path.startsWith('client/')),
    server: shared || paths.some((path) => path.startsWith('server/')),
  }
}

function changedPaths(input: string): string[] | null {
  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  const zero = /^0+$/
  const paths = new Set<string>()
  try {
    for (const line of input.trim().split('\n').filter(Boolean)) {
      const [, local, , remote] = line.trim().split(/\s+/)
      if (zero.test(local)) continue
      const base = zero.test(remote) ? git(['merge-base', local, 'origin/main']) : remote
      for (const path of git(['diff', '--name-only', base, local]).split('\n').filter(Boolean))
        paths.add(path)
    }
    if (!input.trim()) return null
    for (const path of git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean))
      paths.add(path)
    return [...paths]
  } catch {
    return null
  }
}

function runChecks(): void {
  const paths = changedPaths(readFileSync(0, 'utf8'))
  const scopes = paths === null ? { client: true, server: true } : checkScopes(paths)
  const run = (command: string, args: string[], cwd?: string) =>
    execFileSync(command, args, { stdio: 'inherit', cwd })
  if (scopes.client) {
    for (const script of ['format:check', 'lint', 'typecheck', 'test'])
      run('npm', ['--prefix', 'client', 'run', script])
  }
  if (scopes.server && !spawnSync('go', ['version'], { stdio: 'ignore' }).error) {
    const unformatted = execFileSync('gofmt', ['-l', 'server'], { encoding: 'utf8' }).trim()
    if (unformatted) throw new Error(`gofmt needed:\n${unformatted}`)
    run('go', ['-C', 'server', 'test', './...'])
    if (!spawnSync('golangci-lint', ['version'], { stdio: 'ignore' }).error)
      run('golangci-lint', ['run'], 'server')
  }
  if (!scopes.client && !scopes.server)
    console.log('Pre-push: no client or server changes to check')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runChecks()
