````markdown
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      🤖 DISCORD CUSTOM BOT 🤖                                ║
║                                                                              ║
║             Un bot de Discord personalizado, modular y potente               ║
║                                                                              ║
║                 Crea, personaliza y despliega tu propio bot                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
````

---

## 📋 Descripción

**Discord Custom Bot** es un bot de Discord completamente personalizable y modular, diseñado para desarrolladores que desean crear funcionalidades avanzadas para sus servidores. Con una arquitectura limpia y documentación completa, permite agregar comandos y eventos de forma rápida y sencilla.

> **Perfecto para:** Servidores medianos y grandes • Bots temáticos • Herramientas administrativas • Sistemas de moderación

---

## ✨ Características Principales

- ✅ **Comandos Dinámicos** - Sistema modular para añadir comandos sin recargar el bot
- ✅ **Sistema de Eventos** - Responde a eventos de Discord automáticamente
- ✅ **Configuración Flexible** - Variables de entorno para máxima seguridad
- ✅ **Estructura Limpia** - Código bien organizado y fácil de mantener
- ✅ **Documentación Completa** - Guías paso a paso para todo
- ✅ **Fácil Deploy** - Script incluido para iniciar el bot

---

## 🚀 Instalación Rápida

### ⚡ Requisitos Previos

- **Node.js** v16 o superior ([Descargar](https://nodejs.org/))
- **npm** o **yarn** (incluido con Node.js)
- **Discord Bot Token** ([Obtener aquí](https://discord.com/developers/applications))

### 📝 Instalación Paso a Paso

**Paso 1: Clona el repositorio**

```bash
git clone https://github.com/thedarker451-maker/Discord-Custom-Bot.git
cd Discord-Custom-Bot
```

**Paso 2: Instala las dependencias**

```bash
npm install
```

**Paso 3: Configura tu bot**

```bash
cp .env.example .env
# Edita .env con tu token y configuración
nano .env  # o usa tu editor favorito
```

**Paso 4: Inicia el bot**

```bash
npm start
# o si prefieres usar el script
./start.sh
```

---

## 📁 Estructura del Proyecto

```
Discord-Custom-Bot/
│
├── 📂 scr/                        # Código fuente principal
│   ├── index.js                   # 🎯 Punto de entrada del bot
│   ├── config.js                  # ⚙️ Configuración centralizada
│   └── utils.js                   # 🛠️ Funciones auxiliares
│
├── 📂 comandos/                   # 📝 Todos tus comandos van aquí
│   ├── ping.js                    # Ejemplo: comando ping
│   ├── help.js                    # Ejemplo: comando de ayuda
│   └── [tu_comando].js            # ↪️ Agrega tus propios comandos
│
├── 📂 eventos/                    # 🎪 Manejadores de eventos
│   ├── ready.js                   # Cuando el bot inicia
│   ├── messageCreate.js           # Cuando se envía un mensaje
│   └── [tu_evento].js             # ↪️ Crea nuevos eventos
│
├── 🔧 .env                        # Configuración privada (NO COMMITEAR)
├── 📄 .env.example                # Plantilla de configuración
├── 📦 package.json                # Dependencias del proyecto
├── 🚀 start.sh                    # Script de inicio automático
├── .gitignore                     # Archivos a ignorar en git
├── 📝 README.md                   # Este archivo
└── 📜 LICENSE                     # Licencia GPL v2.0

```

---

## ⚙️ Configuración Inicial

### Obtener tu Discord Token

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Haz clic en **"New Application"**
3. Dale un nombre a tu aplicación
4. Dirígete a la pestaña **"Bot"** (lado izquierdo)
5. Haz clic en **"Add Bot"**
6. **Copia el token** (debajo del nombre del bot)
7. ⚠️ Nunca compartas este token con nadie

### Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# 🔐 Token del bot (REQUERIDO)
DISCORD_TOKEN=your_super_secret_token_here

# ⚡ Prefijo de comandos
PREFIX=!

# 👤 Tu ID de Discord (para comandos admin)
OWNER_ID=tu_id_aqui

# 📊 Base de datos (Opcional)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=discord_bot

# 🌍 Ambiente de ejecución
NODE_ENV=development
```

### Obtener tu ID de Discord

1. Abre Discord
2. Ve a **Configuración de usuario** → **Avanzados**
3. Activa **"Developer Mode"** (toggle)
4. Haz **clic derecho** sobre tu usuario en cualquier chat
5. Selecciona **"Copy User ID"**
6. Pégalo como `OWNER_ID` en tu `.env`

---

## 🛠️ Desarrollo y Personalización

### Crear Tu Primer Comando

Crea el archivo `comandos/saludo.js`:

```javascript
module.exports = {
  name: 'saludo',                    // Nombre del comando
  description: 'Te saluda',          // Descripción corta
  aliases: ['hola', 'hi'],          // Alias alternativos
  category: 'general',               // Categoría
  usage: '!saludo [@usuario]',      // Uso del comando
  
  execute(message, args) {
    const user = message.mentions.users.first() || message.author;
    message.reply(\`¡Hola \${user}! 👋\`);
  }
};
```

Luego usa en Discord: `!saludo` o `!hola`

### Crear Tu Primer Evento

Crea el archivo `eventos/guildMemberAdd.js`:

```javascript
module.exports = {
  name: 'guildMemberAdd',           // Nombre del evento
  once: false,                       // ¿Se ejecuta una sola vez?
  
  async execute(member) {
    const channel = member.guild.channels.cache.find(
      ch => ch.name === 'bienvenida'
    );
    
    if (channel) {
      channel.send(\`¡Bienvenido \${member.user} a nuestro servidor! 🎉\`);
    }
  }
};
```

---

## 📋 Comandos de Ejemplo

| Comando | Alias | Descripción | Uso |
|---------|-------|------------|-----|
| `ping` | `latencia` | Muestra latencia del bot | `!ping` |
| `help` | `h`, `ayuda` | Lista todos los comandos | `!help [comando]` |
| `info` | `botinfo` | Información del bot | `!info` |
| `saludo` | `hola` | Te saluda | `!saludo` |

---

## 📚 Comandos NPM Útiles

```bash
# Instalar dependencias
npm install

# Iniciar el bot
npm start

# Instalar una librería específica
npm install discord.js dotenv

# Ver dependencias instaladas
npm list

# Actualizar dependencias
npm update
```

---

## 🔒 Seguridad - ¡IMPORTANTE

⚠️ **Por favor, sigue estas recomendaciones:**

- ✅ **NUNCA** compartas tu archivo `.env`
- ✅ **NUNCA** hagas push de `.env` a GitHub (ya está en `.gitignore`)
- ✅ **NUNCA** muestres tu token en público
- ✅ Si expones accidentalmente tu token, **regenera** en Discord Developer Portal
- ✅ Usa variables de entorno para TODOS los datos sensibles
- ✅ Revisa regularmente los permisos de tu bot

### Regenerar Token (si fue expuesto)

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. Ve a la pestaña **Bot**
4. Haz clic en **"Regenerate"** junto al token
5. Actualiza tu `.env` con el nuevo token

---

## 🐛 Solución de Problemas

### ❌ "El bot no aparece en línea"

```bash
# 1. Verifica tu token
cat .env | grep DISCORD_TOKEN

# 2. Reinicia el bot
npm start

# 3. Comprueba permisos en Discord
# Configuración del servidor → Roles → Tu Bot
# Asegúrate de que tenga permisos necesarios
```

### ❌ "Los comandos no funcionan"

```bash
# 1. Verifica que usas el prefijo correcto (por defecto "!")
# Usa: !ping

# 2. Asegúrate de que los archivos estén en "comandos/"
ls -la comandos/

# 3. Verifica los permisos del bot en el canal
# El bot necesita: "Send Messages", "Read Message History"
```

### ❌ "Error: Cannot find module"

```bash
# Reinstala las dependencias
rm -rf node_modules package-lock.json
npm install
npm start
```

### ❌ "El bot se cierra constantemente"

```bash
# Ejecuta con debug para ver errores
NODE_DEBUG=* npm start

# Revisa los logs
tail -f logs.txt
```

---

## 📚 Recursos y Documentación

- 📖 [Discord.js Official Docs](https://discord.js.org/)
- 🔌 [Discord API Docs](https://discord.com/developers/docs)
- 💾 [Guía de Base de Datos](./docs/database.md)
- 🔐 [Buenas Prácticas de Seguridad](./docs/security.md)
- 🚀 [Deploy en Hosting](./docs/deployment.md)

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Queremos que el proyecto crezca.

### Pasos para Contribuir

1. 🍴 **Fork** el repositorio

   ```bash
   # Haz clic en "Fork" en GitHub
   ```

2. 🌿 **Crea una rama** con tu feature

   ```bash
   git checkout -b feature/MiNuevaFeature
   ```

3. 💻 **Realiza tus cambios** y haz commits

   ```bash
   git commit -m '✨ Agregada nueva feature XXX'
   ```

4. 🚀 **Push** a tu fork

   ```bash
   git push origin feature/MiNuevaFeature
   ```

5. 📤 **Abre un Pull Request**
   - Describe qué cambios hiciste
   - Explica por qué son útiles
   - Sé respetuoso y profesional

### Directrices

- 📝 Código limpio y bien comentado
- 🧪 Prueba tu código antes de PR
- 📚 Actualiza la documentación si es necesario
- 🎯 Un PR = Una feature

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia Pública General GNU v2.0**.

Esto significa:

- ✅ Puedes usar el código libremente
- ✅ Puedes modificarlo
- ✅ Puedes distribuirlo
- ⚠️ Debes mantener la licencia
- ⚠️ Cualquier derivado también debe ser GPL v2.0

Ver archivo completo en [LICENSE](LICENSE).

---

## 📞 Soporte y Comunidad

- 🐛 **Reportar bugs:** [Issues](https://github.com/thedarker451-maker/Discord-Custom-Bot/issues)
- 💡 **Sugerir features:** [Discussions](https://github.com/thedarker451-maker/Discord-Custom-Bot/discussions)
- 💬 **Hacer preguntas:** [Q&A](https://github.com/thedarker451-maker/Discord-Custom-Bot/discussions?discussions_q=category%3AQ%26A)
- 📖 **Documentación:** [Wiki](https://github.com/thedarker451-maker/Discord-Custom-Bot/wiki)

---

## 🌟 Dale una ⭐ si te fue útil

Si este proyecto te ayudó, considera dejarle una estrella en GitHub. ¡Significa mucho para nosotros!

[![GitHub Stars](https://img.shields.io/github/stars/thedarker451-maker/Discord-Custom-Bot?style=social)](https://github.com/thedarker451-maker/Discord-Custom-Bot)

---

## 🎉 Showcase

¿Estás usando nuestro bot? ¡Cuéntanos en las [Discussions](https://github.com/thedarker451-maker/Discord-Custom-Bot/discussions)!

---

## 👨‍💻 Autor

**thedarker451-maker**

- GitHub: [@thedarker451-maker](https://github.com/thedarker451-maker)
- Email: <thedarker451@gmail.com>
- Discord: Abre una issue y te contactaré

---

## Dato curioso

   El bot se llama **Custom Discord Bot** — un bot modular y personalizable para tu servidor.

---

## 📊 Estadísticas

![License](https://img.shields.io/github/license/thedarker451-maker/Discord-Custom-Bot?style=flat-square)
![Stars](https://img.shields.io/github/stars/thedarker451-maker/Discord-Custom-Bot?style=flat-square)
![Forks](https://img.shields.io/github/forks/thedarker451-maker/Discord-Custom-Bot?style=flat-square)
![Issues](https://img.shields.io/github/issues/thedarker451-maker/Discord-Custom-Bot?style=flat-square)

---

````markdown
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      💜 ¡Gracias por usar Discord Custom Bot! 💜             ║
║                                                                              ║
║                  Estamos aquí para hacerte las cosas más fáciles             ║
║                                                                              ║
║                  Happy Bot Development! 🚀 Última actualización 2026         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
````
