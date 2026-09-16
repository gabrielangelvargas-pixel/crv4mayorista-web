import { spawnSync } from 'node:child_process'

run('npm', ['run', 'sync:rubros'])

const status = run('git', ['status', '--short'], { capture: true }).trim()
if (!status) {
  console.log('No hay archivos para subir. La base remota ya quedo sincronizada.')
  process.exit(0)
}

run('git', ['add', 'data/rubros.json', 'public/uploads/rubros', 'uploads/rubros'])
run('git', ['commit', '-m', 'Sync rubros'])
run('git', ['push'])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: options.capture ? 'pipe' : 'inherit',
  })

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr)
    }

    process.exit(result.status ?? 1)
  }

  return options.capture ? result.stdout : ''
}
