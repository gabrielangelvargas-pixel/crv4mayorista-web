import { spawnSync } from 'node:child_process'

run(process.execPath, ['scripts/sync-rubros-from-local.mjs'])

const status = run('git', ['status', '--short'], { capture: true }).trim()
if (!status) {
  console.log('No hay archivos para subir. La base remota ya quedo sincronizada.')
  process.exit(0)
}

run('git', ['add', 'data/rubros.json', 'public/uploads/rubros', 'uploads/rubros', 'package.json', 'scripts/sync-rubros-and-push.mjs'])
run('git', ['commit', '-m', 'Sync rubros'])
run('git', ['push'])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })

  if (result.error) {
    console.error(`No se pudo ejecutar ${command}: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr)
    }

    process.exit(result.status ?? 1)
  }

  return options.capture ? result.stdout : ''
}
