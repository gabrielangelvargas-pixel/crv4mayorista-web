import { access } from 'node:fs/promises'

await access(new URL('../dist/server.js', import.meta.url))
await access(new URL('../server.js', import.meta.url))
console.log('Build verificado: server.js y dist/server.js disponibles.')
