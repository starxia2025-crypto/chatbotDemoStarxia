# Starxia Chatbot

Chatbot propio para Starxia con:

- `Node.js + Express`
- `PostgreSQL`
- `OpenAI API`
- widget embebible en WordPress
- histórico por visitante
- captación de leads dentro del chat
- vistas listas para `Metabase`

## Estructura

- [src/server.js](C:/Users/cjdvi/Documents/chatbotDemoStarxia/src/server.js): arranque del backend
- [db/schema.sql](C:/Users/cjdvi/Documents/chatbotDemoStarxia/db/schema.sql): tablas y vistas para Metabase
- [public/chat-widget.js](C:/Users/cjdvi/Documents/chatbotDemoStarxia/public/chat-widget.js): widget para incrustar en WordPress
- [wordpress-embed-snippet.html](C:/Users/cjdvi/Documents/chatbotDemoStarxia/wordpress-embed-snippet.html): snippet listo para pegar

## Puesta en marcha

1. Instala dependencias:

```bash
npm install
```

2. Crea tu `.env` a partir de `.env.example`.

3. Asegúrate de tener PostgreSQL disponible y una base creada, por ejemplo `starxia_chatbot`.

4. Arranca el servidor:

```bash
npm run dev
```

El backend expone:

- `POST /api/chat/session`
- `GET /api/chat/history?visitor_id=...`
- `POST /api/chat/message`
- `POST /api/chat/lead-capture/start`
- `POST /api/chat/lead`
- `POST /api/chat/event`
- `GET /health`

## Despliegue en VPS

### Backend

- Sube esta carpeta al VPS.
- Configura `DATABASE_URL`, `OPENAI_API_KEY` y `ALLOWED_ORIGINS`.
- Expón el backend detrás de Nginx o Caddy con HTTPS.
- Sirve el archivo del widget en `https://tu-dominio-vps.com/widget/chat-widget.js`.
- Si defines `RAW_CONTENT_PATH` en variables de entorno y el nombre del archivo contiene `#`, ponlo entre comillas.
  Ejemplo:

```env
RAW_CONTENT_PATH="./# RAW para chatbot de atención al cliente.md"
```

### EasyPanel con Dockerfile

Si EasyPanel te da problemas con Nixpacks, usa la opción `Dockerfile`.

- Ruta de compilación: `/`
- Dockerfile: `Dockerfile`
- No hace falta comando de instalación, compilación ni inicio manual
- Puerto interno: `3000`

El contenedor arrancará con:

```bash
node src/server.js
```

### WordPress

1. Si quieres usar directamente el avatar actual, ya queda servido desde `/widget/starxist-avatar.png`.
2. Si prefieres servirlo desde WordPress/CDN, sube allí la imagen y cambia `avatarUrl`.
3. Copia el contenido de [wordpress-embed-snippet.html](C:/Users/cjdvi/Documents/chatbotDemoStarxia/wordpress-embed-snippet.html).
4. Sustituye:
   - `TU-DOMINIO-VPS.com`
   - el `avatarUrl` si no quieres usar el del backend
5. Pega el snippet en tu bloque HTML personalizado.

## Notas de negocio

- El contenido base del chatbot se lee desde [# RAW para chatbot de atención al cliente.md](C:/Users/cjdvi/Documents/chatbotDemoStarxia/# RAW para chatbot de atención al cliente.md).
- El backend detecta intención comercial fuera del prompt y puede mostrar un formulario de lead cuando detecta:
  - presupuesto
  - app o webapp
  - automatización
  - chatbot
  - página web

## Metabase

Conecta Metabase a la misma base PostgreSQL y usa:

- `metabase_chat_overview`
- `metabase_lead_summary`

## Captación conversacional

Además del formulario visual, el widget ya permite iniciar una captación guiada por chat:

- el backend crea un estado de captura en `lead_capture_states`
- el bot va pidiendo los datos uno a uno dentro del chat
- al terminar, se guarda un lead normal en `leads`
- si el usuario recarga la página en mitad del proceso, la conversación puede continuar

## Tests

```bash
npm test
```
