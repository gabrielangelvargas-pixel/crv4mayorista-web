# Deploy en Hostinger

Esta app esta preparada para desplegarse como **Node.js Web App** desde GitHub.

## Configuracion recomendada

- Framework: Node.js / Express
- Node.js: 24.x
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`
- Startup file: `server.js`
- Branch: `main`
- Dominio: `crv4mayorista.com.ar`

## Variables de entorno

Configura estas variables en Hostinger durante el despliegue:

```env
PORT=3000
SITE_URL=https://crv4mayorista.com.ar
DATABASE_URL=mysql://u605057087_crv4web:REEMPLAZAR_PASSWORD@localhost:3306/u605057087_crv4web
LOCAL_API_URL=https://192.168.100.128:5443
LOCAL_API_USER=REEMPLAZAR_USUARIO
LOCAL_API_PASSWORD=REEMPLAZAR_PASSWORD
```

Notas:

- No subir `.env` a GitHub. Usar `.env.example` como referencia.
- En `DATABASE_URL`, reemplazar `REEMPLAZAR_PASSWORD` por la clave de la base creada en Hostinger.
- El renderizado es del lado servidor para que WhatsApp, Facebook y otras redes lean los metadatos.
- Las imagenes publicas de rubros van en `public/uploads/rubros`.
- Cuando hagamos la sincronizacion desde la API local, el proceso deberia actualizar `data/rubros.json` y copiar las imagenes procesadas.

## Sincronizacion de rubros

Desde la PC local, configurar `.env` con:

```env
DATABASE_URL=mysql://u605057087_crv4web:TU_PASSWORD_HOSTINGER@HOST_MYSQL:3306/u605057087_crv4web
LOCAL_API_URL=https://192.168.100.128:5443
LOCAL_API_USER=TU_USUARIO_LOCAL
LOCAL_API_PASSWORD=TU_PASSWORD_LOCAL
```

Luego ejecutar:

```bash
npm run sync:rubros
npm run build:local
git add data/rubros.json public/uploads/rubros dist package-lock.json package.json
git commit -m "Sync public rubros"
git push
```

El script actualiza la tabla `rubros` de Hostinger y descarga las imagenes publicas en `public/uploads/rubros`.

## Flujo GitHub + Hostinger

1. Crear un repositorio en GitHub, por ejemplo `crv4mayorista-web`.
2. Subir el contenido de esta carpeta `web-publica` como raiz del repositorio.
3. En Hostinger, elegir **Anadir sitio web** y luego **Desplegar app web**.
4. Elegir **Import Git Repository**.
5. Seleccionar el repositorio y la branch `main`.
6. Configurar los comandos y variables de entorno de este documento.
7. Ejecutar el deploy.

## Comandos locales

```bash
npm install
npm run build:local
npm start
```
