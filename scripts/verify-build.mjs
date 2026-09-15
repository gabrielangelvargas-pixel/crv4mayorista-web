import { access } from 'node:fs/promises'

await access(new URL('../dist/server.js', import.meta.url))
console.log('Build verificado: dist/server.js disponible.')
