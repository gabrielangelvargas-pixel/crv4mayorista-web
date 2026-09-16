import 'dotenv/config'
import { access, mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

const databaseUrl = requireEnv('DATABASE_URL')
const localApiUrl = requireEnv('LOCAL_API_URL').replace(/\/+$/, '')
const localApiUser = requireEnv('LOCAL_API_USER')
const localApiPassword = requireEnv('LOCAL_API_PASSWORD')
const projectRoot = process.cwd()
const publicUploadsPath = path.join(projectRoot, 'public', 'uploads', 'rubros')
const rootUploadsPath = path.join(projectRoot, 'uploads', 'rubros')
const dataPath = path.join(projectRoot, 'data', 'rubros.json')

if (process.env.ALLOW_SELF_SIGNED_LOCAL_API !== 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

await mkdir(publicUploadsPath, { recursive: true })
await mkdir(rootUploadsPath, { recursive: true })

const token = await login()
const localRubros = await getLocalRubros(token)
const { rubros, changedCount, skippedCount, deactivatedCount } = await syncDatabase(localRubros, token)
const publicRubros = rubros
  .map(({ localId: _localId, localIdPadre: _localIdPadre, ...rubro }) => rubro)
  .filter((rubro) => rubro.activo)
await writeFile(dataPath, `${JSON.stringify(publicRubros, null, 2)}\n`, 'utf8')

console.log(`Rubros revisados: ${rubros.length}. Actualizados: ${changedCount}. Sin cambios: ${skippedCount}. Desactivados remotos: ${deactivatedCount}.`)

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
  await writeFile(path.join(rootUploadsPath, fileName), buffer)
  return `/uploads/rubros/${fileName}`
}

async function ensureSyncedImage(imagePath, token, forceDownload) {
  const publicImagePath = getPublicImagePath(imagePath)
  if (!publicImagePath) {
    return null
  }

  if (/^https?:\/\//i.test(publicImagePath)) {
    return publicImagePath
  }

  if (!forceDownload && await fileExistsInUploads(publicImagePath)) {
    return publicImagePath
  }

  return await syncImage(imagePath, token)
}

function getPublicImagePath(imagePath) {
  if (!imagePath) {
    return null
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath
  }

  const fileName = sanitizeFileName(path.basename(imagePath))
  return fileName ? `/uploads/rubros/${fileName}` : null
}

async function fileExistsInUploads(publicImagePath) {
  const fileName = path.basename(publicImagePath)
  try {
    await access(path.join(publicUploadsPath, fileName))
    await access(path.join(rootUploadsPath, fileName))
    return true
  } catch {
    return false
  }
}

async function deleteSyncedImage(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/rubros/')) {
    return
  }

  const fileName = path.basename(imagePath)
  await Promise.all([
    unlink(path.join(publicUploadsPath, fileName)).catch(ignoreMissingFile),
    unlink(path.join(rootUploadsPath, fileName)).catch(ignoreMissingFile),
  ])
}

function ignoreMissingFile(error) {
  if (error?.code !== 'ENOENT') {
    throw error
  }
}

function sanitizeFileName(fileName) {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  return normalized || null
}

async function syncDatabase(localRubros, token) {
  const connection = await mysql.createConnection(databaseUrl)
  try {
    await connection.beginTransaction()
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rubros (
        Id INT NOT NULL AUTO_INCREMENT,
        LocalId INT NULL,
        IdRubro VARCHAR(6) NOT NULL,
        NombreRubro VARCHAR(45) NOT NULL,
        Descripcion VARCHAR(255) NULL,
        ImagenPrincipal VARCHAR(255) NULL,
        IdPadre INT NULL,
        Orden INT NOT NULL DEFAULT 0,
        Activo TINYINT(1) NOT NULL DEFAULT 1,
        FechaModificacion DATETIME NULL,
        PRIMARY KEY (Id),
        KEY idx_rubros_LocalId (LocalId),
        UNIQUE KEY uq_rubros_IdRubro (IdRubro),
        KEY fk_rubros_padre (IdPadre)
      )
    `)
    await ensureRemoteColumn(connection, 'LocalId', 'INT NULL AFTER `Id`')
    await ensureRemoteIndex(connection, 'idx_rubros_LocalId', 'CREATE INDEX idx_rubros_LocalId ON rubros (LocalId)')
    await ensureRemoteColumn(connection, 'Activo', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `Orden`')
    await ensureRemoteColumn(connection, 'FechaModificacion', 'DATETIME NULL AFTER `Activo`')

    const [existingRows] = await connection.execute(`
      SELECT Id, LocalId, IdRubro, NombreRubro, Descripcion, ImagenPrincipal, Orden, Activo, FechaModificacion
      FROM rubros
    `)
    const existingByCode = new Map(existingRows.map((row) => [row.IdRubro, row]))
    const existingByLocalId = new Map(
      existingRows
        .filter((row) => row.LocalId !== null && row.LocalId !== undefined)
        .map((row) => [Number(row.LocalId), row]),
    )
    const rubros = []
    const localCodes = new Set()
    const matchedRemoteIds = new Set()
    let changedCount = 0
    let skippedCount = 0
    let deactivatedCount = 0

    for (const localRubro of localRubros) {
      localCodes.add(localRubro.codigo)
      const remoteRubro = existingByLocalId.get(Number(localRubro.id)) ?? existingByCode.get(localRubro.codigo)
      const rubro = {
        localId: localRubro.id,
        codigo: localRubro.codigo,
        nombre: localRubro.nombre,
        descripcion: localRubro.descripcion ?? null,
        imagenPrincipal: getPublicImagePath(localRubro.imagenPrincipal),
        localIdPadre: localRubro.idPadre ?? null,
        nombrePadre: localRubro.nombrePadre ?? null,
        orden: localRubro.orden ?? 0,
        activo: localRubro.activo ?? true,
        fechaModificacion: normalizeDate(localRubro.fechaModificacion),
      }
      const hasChanges = isRubroChanged(rubro, remoteRubro)
      rubro.imagenPrincipal = await ensureSyncedImage(localRubro.imagenPrincipal, token, hasChanges)
      rubros.push(rubro)
      if (remoteRubro) {
        matchedRemoteIds.add(Number(remoteRubro.Id))
      }

      if (!hasChanges) {
        skippedCount += 1
        continue
      }

      if (remoteRubro?.ImagenPrincipal && remoteRubro.ImagenPrincipal !== rubro.imagenPrincipal) {
        await deleteSyncedImage(remoteRubro.ImagenPrincipal)
      }

      if (remoteRubro) {
        await connection.execute(
          `
            UPDATE rubros
            SET LocalId = ?,
                IdRubro = ?,
                NombreRubro = ?,
                Descripcion = ?,
                ImagenPrincipal = ?,
                Orden = ?,
                Activo = ?,
                FechaModificacion = ?
            WHERE Id = ?
          `,
          [rubro.localId, rubro.codigo, rubro.nombre, rubro.descripcion, rubro.imagenPrincipal, rubro.orden, rubro.activo ? 1 : 0, toMysqlDate(rubro.fechaModificacion), remoteRubro.Id],
        )
      } else {
        await connection.execute(
          `
            INSERT INTO rubros (LocalId, IdRubro, NombreRubro, Descripcion, ImagenPrincipal, IdPadre, Orden, Activo, FechaModificacion)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
          `,
          [rubro.localId, rubro.codigo, rubro.nombre, rubro.descripcion, rubro.imagenPrincipal, rubro.orden, rubro.activo ? 1 : 0, toMysqlDate(rubro.fechaModificacion)],
        )
      }
      changedCount += 1
    }

    for (const remoteRubro of existingRows) {
      if (matchedRemoteIds.has(Number(remoteRubro.Id)) || localCodes.has(remoteRubro.IdRubro) || Number(remoteRubro.Activo ?? 1) === 0) {
        continue
      }

      await connection.execute(
        'UPDATE rubros SET Activo = 0, FechaModificacion = NOW() WHERE Id = ?',
        [remoteRubro.Id],
      )
      deactivatedCount += 1
    }

    const [rows] = await connection.execute('SELECT Id, IdRubro FROM rubros')
    const idByCode = new Map(rows.map((row) => [row.IdRubro, row.Id]))
    const localIdToCode = new Map(rubros.map((rubro) => [rubro.localId, rubro.codigo]))

    for (const rubro of rubros) {
      const parentCode = rubro.localIdPadre ? localIdToCode.get(rubro.localIdPadre) : null
      const parentId = parentCode ? idByCode.get(parentCode) ?? null : null
      await connection.execute(
        'UPDATE rubros SET LocalId = ?, IdPadre = ? WHERE IdRubro = ?',
        [rubro.localId, parentId, rubro.codigo],
      )
    }

    await connection.commit()
    return { rubros, changedCount, skippedCount, deactivatedCount }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

async function ensureRemoteColumn(connection, columnName, columnDefinition) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'rubros'
        AND COLUMN_NAME = ?
    `,
    [columnName],
  )
  if (Number(rows[0]?.total ?? 0) > 0) {
    return
  }

  await connection.execute(`ALTER TABLE rubros ADD COLUMN ${columnName} ${columnDefinition}`)
}

async function ensureRemoteIndex(connection, indexName, createStatement) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'rubros'
        AND INDEX_NAME = ?
    `,
    [indexName],
  )
  if (Number(rows[0]?.total ?? 0) > 0) {
    return
  }

  await connection.execute(createStatement)
}

function isRubroChanged(rubro, remoteRubro) {
  if (!remoteRubro) {
    return true
  }

  const localDate = parseDate(rubro.fechaModificacion)
  const remoteDate = parseDate(remoteRubro.FechaModificacion)
  if (localDate && (!remoteDate || localDate > remoteDate)) {
    return true
  }

  return Number(remoteRubro.LocalId ?? 0) !== Number(rubro.localId)
    || remoteRubro.IdRubro !== rubro.codigo
    || remoteRubro.NombreRubro !== rubro.nombre
    || normalizeNullable(remoteRubro.Descripcion) !== normalizeNullable(rubro.descripcion)
    || normalizeNullable(remoteRubro.ImagenPrincipal) !== normalizeNullable(rubro.imagenPrincipal)
    || Number(remoteRubro.Orden ?? 0) !== rubro.orden
    || Boolean(remoteRubro.Activo ?? true) !== rubro.activo
}

function normalizeNullable(value) {
  return value ?? null
}

function normalizeDate(value) {
  const date = parseDate(value)
  return date ? date.toISOString() : null
}

function parseDate(value) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toMysqlDate(value) {
  const date = parseDate(value) ?? new Date()
  const pad = (number) => number.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
