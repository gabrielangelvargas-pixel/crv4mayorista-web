import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

const databaseUrl = requireEnv('DATABASE_URL')
const localApiUrl = requireEnv('LOCAL_API_URL').replace(/\/+$/, '')
const localApiUser = requireEnv('LOCAL_API_USER')
const localApiPassword = requireEnv('LOCAL_API_PASSWORD')
const projectRoot = process.cwd()
const publicUploadsPath = path.join(projectRoot, 'public', 'uploads', 'rubros')
const dataPath = path.join(projectRoot, 'data', 'rubros.json')

if (process.env.ALLOW_SELF_SIGNED_LOCAL_API !== 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

await mkdir(publicUploadsPath, { recursive: true })

const token = await login()
const localRubros = await getLocalRubros(token)
const rubros = []

for (const rubro of localRubros) {
  rubros.push({
    localId: rubro.id,
    codigo: rubro.codigo,
    nombre: rubro.nombre,
    descripcion: rubro.descripcion ?? null,
    imagenPrincipal: await syncImage(rubro.imagenPrincipal, token),
    localIdPadre: rubro.idPadre ?? null,
    nombrePadre: rubro.nombrePadre ?? null,
    orden: rubro.orden ?? 0,
  })
}

const publicRubros = rubros.map(({ localId: _localId, localIdPadre: _localIdPadre, ...rubro }) => rubro)
await writeFile(dataPath, `${JSON.stringify(publicRubros, null, 2)}\n`, 'utf8')
await syncDatabase(rubros)

console.log(`Rubros sincronizados: ${rubros.length}`)

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta configurar ${name}`)
  }

  return value
}

async function login() {
  const response = await fetch(`${localApiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombreUsuario: localApiUser,
      password: localApiPassword,
    }),
  })

  if (!response.ok) {
    throw new Error(`No se pudo iniciar sesion en la API local. HTTP ${response.status}`)
  }

  const body = await response.json()
  if (!body.accessToken) {
    throw new Error('La API local no devolvio accessToken.')
  }

  return body.accessToken
}

async function getLocalRubros(token) {
  const response = await fetch(`${localApiUrl}/api/rubros`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`No se pudieron leer los rubros locales. HTTP ${response.status}`)
  }

  return await response.json()
}

async function syncImage(imagePath, token) {
  if (!imagePath) {
    return null
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath
  }

  const imageUrl = `${localApiUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`
  const fileName = sanitizeFileName(path.basename(new URL(imageUrl).pathname))
  if (!fileName) {
    return null
  }

  const response = await fetch(imageUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    console.warn(`No se pudo descargar imagen ${imagePath}. HTTP ${response.status}`)
    return null
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path.join(publicUploadsPath, fileName), buffer)
  return `/uploads/rubros/${fileName}`
}

function sanitizeFileName(fileName) {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  return normalized || null
}

async function syncDatabase(rubros) {
  const connection = await mysql.createConnection(databaseUrl)
  try {
    await connection.beginTransaction()
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rubros (
        Id INT NOT NULL AUTO_INCREMENT,
        IdRubro VARCHAR(6) NOT NULL,
        NombreRubro VARCHAR(45) NOT NULL,
        Descripcion VARCHAR(255) NULL,
        ImagenPrincipal VARCHAR(255) NULL,
        IdPadre INT NULL,
        Orden INT NOT NULL DEFAULT 0,
        PRIMARY KEY (Id),
        UNIQUE KEY uq_rubros_IdRubro (IdRubro),
        KEY fk_rubros_padre (IdPadre)
      )
    `)

    for (const rubro of rubros) {
      await connection.execute(
        `
          INSERT INTO rubros (IdRubro, NombreRubro, Descripcion, ImagenPrincipal, IdPadre, Orden)
          VALUES (?, ?, ?, ?, NULL, ?)
          ON DUPLICATE KEY UPDATE
            NombreRubro = VALUES(NombreRubro),
            Descripcion = VALUES(Descripcion),
            ImagenPrincipal = VALUES(ImagenPrincipal),
            Orden = VALUES(Orden)
        `,
        [rubro.codigo, rubro.nombre, rubro.descripcion, rubro.imagenPrincipal, rubro.orden],
      )
    }

    const [rows] = await connection.execute('SELECT Id, IdRubro FROM rubros')
    const idByCode = new Map(rows.map((row) => [row.IdRubro, row.Id]))
    const localIdToCode = new Map(rubros.map((rubro) => [rubro.localId, rubro.codigo]))

    for (const rubro of rubros) {
      const parentCode = rubro.localIdPadre ? localIdToCode.get(rubro.localIdPadre) : null
      const parentId = parentCode ? idByCode.get(parentCode) ?? null : null
      await connection.execute(
        'UPDATE rubros SET IdPadre = ? WHERE IdRubro = ?',
        [parentId, rubro.codigo],
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}
