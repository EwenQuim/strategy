import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { transformWithOxc, type Plugin, type ResolvedConfig } from 'vite'

export function pwa(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'hexmate-pwa',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async closeBundle() {
      const directory = resolve(config.root, config.build.outDir)
      const source = readFileSync(new URL('./service-worker.ts', import.meta.url), 'utf8')
      const files = readdirSync(directory, { recursive: true, encoding: 'utf8' })
        .filter(
          (file) =>
            statSync(join(directory, file)).isFile() &&
            !file.endsWith('.map') &&
            file !== 'sw.js' &&
            file !== '404.html',
        )
        .sort()
      const hash = createHash('sha256').update(source)
      for (const file of files) hash.update(file).update(readFileSync(join(directory, file)))
      const version = hash.digest('hex').slice(0, 16)
      const assets = files.map((file) => config.base + file.replaceAll('\\', '/'))
      const { code } = await transformWithOxc(source, 'service-worker.ts')
      writeFileSync(
        join(directory, 'sw.js'),
        `const VERSION = ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
${code}`,
      )
      copyFileSync(join(directory, 'index.html'), join(directory, '404.html'))
    },
  }
}
