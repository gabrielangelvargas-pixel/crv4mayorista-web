# CRV4 Mayorista publica

App Node.js para publicar el catalogo en `crv4mayorista.com.ar`.

## Comandos

```powershell
npm install
npm run build
npm start
```

En desarrollo:

```powershell
npm run dev
```

## Variables

Crear `.env` en Hostinger si hace falta:

```env
PORT=3000
SITE_URL=https://crv4mayorista.com.ar
```

## Despliegue Hostinger

Configurar el dominio `crv4mayorista.com.ar` apuntando a esta app Node.

Comando de build:

```bash
npm install && npm run build
```

Comando de inicio:

```bash
npm start
```

## Datos

Por ahora los rubros se leen desde `data/rubros.json`.

Las imagenes publicas deben quedar debajo de:

```text
public/uploads/rubros
```

El siguiente paso es crear el sincronizador desde la API local para actualizar `data/rubros.json` y copiar las imagenes procesadas.
