#  Guía de Docker y Render para Discord Custom Bot

## Requisitos Previos
- Docker instalado ([Descargar Docker](https://www.docker.com/products/docker-desktop))
- Docker Compose (incluido en Docker Desktop)

## Configuración Inicial

### 1. Crear archivo de variables de entorno
```bash
cp .env.example .env
```

Edita `.env` y reemplaza `your_bot_token_here` con tu token real de Discord:
```env
DISCORD_TOKEN=tu_token_de_discord_aqui
REDIS_URL=redis://redis:6379
REDIS_DB=true
```

### 2. Crear carpeta secrets
```bash
mkdir -p secrets
```

## Uso con Docker

### Docker Compose (Recomendado)
```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f bot

# Detener
docker-compose down
```

### Docker Manual
```bash
docker build -t discord-bot .
docker run -d --name discord-bot --env-file .env -v $(pwd)/secrets:/app/secrets -p 3000:3000 discord-bot
```

### Script Helper
```bash
./docker-helper.sh start      # Iniciar
./docker-helper.sh logs       # Ver logs
./docker-helper.sh health     # Verificar health
./docker-helper.sh status-url # Abrir página de estado
./docker-helper.sh stop       # Detener
```

## Despliegue en Render

### 1. Subir a GitHub
```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### 2. Crear servicio en Render
1. Ir a [render.com](https://render.com) → New → Web Service
2. Conectar el repositorio de GitHub
3. Render detectará `render.yaml` automáticamente
4. Configurar variables de entorno en el dashboard:
   - `DISCORD_TOKEN` → tu token
   - `REDIS_DB` → `false` (Render no incluye Redis)
   - `REDIS_URL` → dejar vacío

### 3. URLs en Render
Una vez desplegado, tendrás:
- Leaderboard: `https://tu-app.onrender.com/leaderboard`
- Estado: `https://tu-app.onrender.com/status`
- Health: `https://tu-app.onrender.com/api/health`

## Páginas Disponibles

| Ruta | Descripción |
|------|-------------|
| `/` | Redirect al leaderboard |
| `/leaderboard` | Ranking de economía |
| `/status` | Estado de servicios (bot, Redis, etc.) |
| `/api/health` | Health check JSON (para Docker/Render) |

## Encriptación del .env

```bash
# Encriptar variables sensibles
node scr/security-helper.js --encrypt

# Desencriptar todo el .env (sin borrar la clave)
node scr/security-helper.js --decrypt-all

# Resetear: desencriptar + borrar clave
node scr/security-helper.js --reset
```

O con npm:
```bash
npm run security    # Encriptar
npm run decrypt     # Desencriptar todo
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Token del bot (requerido) | - |
| `REDIS_URL` | URL de Redis | `redis://redis:6379` |
| `REDIS_DB` | Usar Redis | `true` |
| `PORT` | Puerto del servidor | `3000` |
| `LEADERBOARD_ENABLED` | Mostrar leaderboard | `true` |
| `NODE_ENV` | Ambiente | `production` |
| `TELEMETRY_STATE` | Logs detallados | `false` |

## Solución de Problemas

### Error: "DISCORD_TOKEN no está configurado"
```bash
cat .env | grep DISCORD_TOKEN
```

### Error: "Cannot find module"
```bash
docker-compose build --no-cache
```

### Error de conexión a Redis
```bash
docker-compose logs redis
docker-compose restart redis
```

### Bot no responde en Render
Verificar logs en el dashboard de Render o:
```bash
curl https://tu-app.onrender.com/api/health
```

## Limpiar Recursos
```bash
docker-compose down -v    # Contenedores + volúmenes
docker image prune -a     # Imágenes no usadas
docker system prune -a    # Todo
```

---
**Creado para Discord Custom Bot**
