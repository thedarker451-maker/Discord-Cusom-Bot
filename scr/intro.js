import { createInterface } from 'readline';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import open from 'open';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SECRETS_DIR = join(ROOT, 'secrets');
const ENV_PATH = join(SECRETS_DIR, '.env');

// Colores
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    darkGreen: '\x1b[38;2;0;100;0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m'
};

const ASCII_ART = [
    '  ▄▄▄▄▄▄                                                 ▄▄                                   ██',
    '  ▀▀██▀▀               ██                                ██                                   ▀▀',
    '    ██     ██▄████▄  ███████    ██▄████   ▄████▄    ▄███▄██  ██    ██   ▄█████▄   ▄█████▄   ████      ▄████▄   ██▄████▄',
    '    ██     ██▀   ██    ██       ██▀      ██▀  ▀██  ██▀  ▀██  ██    ██  ██▀    ▀  ██▀    ▀     ██     ██▀  ▀██  ██▀   ██',
    '    ██     ██    ██    ██       ██       ██    ██  ██    ██  ██    ██  ██        ██           ██     ██    ██  ██    ██',
    '  ▄▄██▄▄   ██    ██    ██▄▄▄    ██       ▀██▄▄██▀  ▀██▄▄███  ██▄▄▄███  ▀██▄▄▄▄█  ▀██▄▄▄▄█  ▄▄▄██▄▄▄  ▀██▄▄██▀  ██    ██',
    '  ▀▀▀▀▀▀   ▀▀    ▀▀     ▀▀▀▀    ▀▀         ▀▀▀▀      ▀▀▀ ▀▀   ▀▀▀▀ ▀▀    ▀▀▀▀▀     ▀▀▀▀▀   ▀▀▀▀▀▀▀▀    ▀▀▀▀    ▀▀    ▀▀'
];

const GRADIENT = [
    '\x1b[38;2;144;238;144m', // light green
    '\x1b[38;2;50;205;50m',  // lime green
    '\x1b[38;2;34;139;34m',  // forest green
    '\x1b[38;2;0;128;0m',    // green
    '\x1b[38;2;0;100;0m',    // dark green
    '\x1b[38;2;0;80;0m',     // darker green
    '\x1b[38;2;0;50;0m'      // very dark green
];

const FIELDS = [
    { key: 'DISCORD_TOKEN', label: 'Bot token', secret: true, validate: v => v.length > 50 },
    { key: 'GUILD_ID', label: 'Servidor Id', validate: v => /^\d{17,20}$/.test(v) },
    { key: 'APPEAL_GUILD_ID', label: 'Apeal server Id', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'LEADERBOARD_REFRESH', label: 'Tiempo de refresco de leaderboard (ms)', validate: v => /^\d+$/.test(v) },
    { key: 'CUSTOM_AI', label: 'Custom AI (true/false)', validate: v => !v || v === 'true' || v === 'false', default: 'true' },
    { key: 'PROVIDER', label: 'AI Provider (groq, openai, xiaomi, mistral, gemini, ollama, duckduckgo, 100+...)', secret: true, validate: v => v.length > 0 },
    { key: 'API_KEY', label: 'Api-Key (deja vacío si usas opencode/ollama/duckduckgo)', secret: true, validate: v => !v || v.length > 3 },
    { key: 'AUTH', label: 'Auth header (opcional, usa esto en vez de API_KEY)', secret: true, validate: v => !v || v.length > 3 },
    { key: 'CUSTOM_URL', label: 'Custom URL (para custom/xiaomi/litellm)', secret: true, validate: v => !v || v.startsWith('http') },
    { key: 'AI_MODEL', label: 'AI Model (deja vacío para modelo por defecto)', validate: v => !v || v.length > 0 },
    { key: 'PREFIX', label: 'Prefix', validate: v => v.length > 0 && v.length < 5, default: '!' },
    { key: 'LOGS_CHANNEL', label: 'canal-logs (Id)', secret: true, validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'OWNER_ROLE', label: 'rol-owner (Id)', secret: true, validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'MOD_ROLE', label: 'rol-mod (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'STAFF_ROLE', label: 'rol-staff (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'MEMBER_ROLE', label: 'rol-miembro (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'BOOSTER_ROLE', label: 'rol-booster (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'MUTED_ROLE', label: 'rol-muted (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'VIP_ROLE', label: 'rol-vip (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'NITRO_ROLE', label: 'rol-nitro (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'VERIFIED_ROLE', label: 'rol-verificado (Id)', validate: v => !v || /^\d{17,20}$/.test(v) },
    { key: 'REDIS_URL', label: 'Redis URL (opcional)', secret: true, validate: v => !v || v.startsWith('redis://') || v.startsWith('rediss://') }
];

let currentIndex = 0;
let isTyping = true;
let showSecrets = false;
const values = {};
FIELDS.forEach(f => values[f.key] = f.default || '');

let roleHelperServer = null;

function render() {
    process.stdout.write('\x1b[2J\x1b[0;0H'); // Clear screen
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    const center = (text) => {
        const visibleLen = text.replace(/\x1b\[[0-9;]*m/g, '').length;
        const pad = Math.max(0, Math.floor((cols - visibleLen) / 2));
        return ' '.repeat(pad) + text;
    };

    if (cols >= 90 && rows >= 20) {
        console.log(center(`${c.bold}${c.green}INTRODUCION MODE:${c.reset}\n`));
        ASCII_ART.forEach((line, i) => {
            const color = GRADIENT[i % GRADIENT.length];
            console.log(center(`${color}${line}${c.reset}`));
        });
        console.log('');
    } else {
        console.log(center(`${c.bold}${c.green}INTRODUCION MODE:${c.reset}\n`));
    }

    console.log(center(`${c.dim}Controles: [↑/↓] Navegar · [Enter] Editar · [F5] Ver/Ocultar secretos · [F2] Ayudante Web · [Ctrl+C] Salir${c.reset}`));
    console.log(center(`${c.dim}Para guardar, navega al final y presiona [Enter] en [ ✓ COMPROBAR Y GUARDAR ]${c.reset}`));
    console.log('');

    FIELDS.forEach((f, i) => {
        const isCurrent = i === currentIndex && isTyping;
        const pointer = i === currentIndex && !isTyping ? `${c.cyan}▶${c.reset} ` : '  ';
        const rawVal = values[f.key];
        let displayVal = rawVal;
        if (f.secret && rawVal.length > 0 && !isCurrent && !showSecrets) {
            displayVal = '*'.repeat(rawVal.length);
        }

        let status = '';
        if (rawVal.length > 0) {
            const isValid = f.validate(rawVal);
            status = isValid ? ` ${c.green}[ ✓ ]${c.reset}` : ` ${c.red}[ ✗ ]${c.reset}`;
        } else if (f.default && rawVal === '') {
            displayVal = `${c.dim}${f.default}${c.reset}`;
        }

        let line = `${pointer}[ ${f.label} ]: ${displayVal}${status}`;

        if (isCurrent) {
            line = `${c.cyan}▶ [ ${f.label} ]: ${c.reset}${c.bold}${rawVal}${c.reset}█${status}`;
        }

        console.log(center(line));
    });

    console.log('');
    if (currentIndex === FIELDS.length && !isTyping) {
        console.log(center(`${c.green}▶ [ ✓ COMPROBAR Y GUARDAR ]${c.reset}`));
    } else {
        console.log(center(`  [ ✓ COMPROBAR Y GUARDAR ]`));
    }
}

async function startRoleHelper() {
    if (roleHelperServer) return; // Already running

    const token = (values['DISCORD_TOKEN'] || '').trim();
    const guildId = (values['GUILD_ID'] || '').trim();

    if (!token || !guildId || token.length < 50 || !/^\d{17,20}$/.test(guildId)) {
        console.log(`\n${c.red}[!] Necesitas ingresar el "Bot token" y el "Servidor Id" válidos primero.${c.reset}`);
        setTimeout(render, 2500);
        return;
    }

    const app = express();
    const port = 3333;

    app.get('/', (req, res) => {
        res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Discord Roles Helper</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1e1e2e; color: #cdd6f4; text-align: center; padding: 20px; }
                h1 { color: #a6e3a1; }
                .role-list { max-width: 600px; margin: 0 auto; text-align: left; background: #181825; padding: 20px; border-radius: 10px; }
                .role-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #313244; }
                .role-item:last-child { border-bottom: none; }
                .btn { background: #89b4fa; color: #11111b; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; }
                .btn:hover { background: #b4befe; }
                .btn.copied { background: #a6e3a1; }
            </style>
        </head>
        <body>
            <h1>🎭 Ayudante de Roles</h1>
            <p>Obteniendo roles del servidor...</p>
            <script>
                fetch('/api/roles').then(r => r.json()).then(data => {
                    if(data.error) {
                        document.body.innerHTML += '<p style="color:#f38ba8;">Error: ' + data.error + '</p>';
                        return;
                    }
                    let html = '<div class="role-list">';
                    data.sort((a,b) => b.position - a.position).forEach(role => {
                        html += '<div class="role-item">';
                        html += '<span><span style="color:#' + (role.color ? role.color.toString(16).padStart(6,'0') : 'fff') + '">●</span> <b>' + role.name + '</b></span>';
                        html += '<button class="btn" onclick="copyId(this, \\'' + role.id + '\\')">Copiar ID</button>';
                        html += '</div>';
                    });
                    html += '</div>';
                    document.body.innerHTML = '<h1>🎭 Ayudante de Roles</h1>' + html;
                });

                function copyId(btn, id) {
                    navigator.clipboard.writeText(id).then(() => {
                        const oldText = btn.innerText;
                        btn.innerText = '¡Copiado!';
                        btn.classList.add('copied');
                        setTimeout(() => { btn.innerText = oldText; btn.classList.remove('copied'); }, 2000);
                    });
                }
            </script>
        </body>
        </html>
        `);
    });

    app.get('/api/roles', (req, res) => {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: `/api/v10/guilds/${guildId}/roles`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}` }
        };

        const apiReq = https.request(options, apiRes => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                if (apiRes.statusCode === 401) {
                    return res.json({ error: `Token inválido. Por favor vuelve a la consola, corrige tu "Bot token" y vuelve a intentarlo.` });
                } else if (apiRes.statusCode !== 200) {
                    return res.json({ error: `Discord API devolvió status ${apiRes.statusCode}. Revisa tu Servidor Id o Token.` });
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(data);
            });
        });
        apiReq.on('error', e => res.json({ error: e.message }));
        apiReq.end();
    });

    roleHelperServer = app.listen(port, () => {
        console.log(`\n${c.green}[+] Servidor de roles abierto en http://localhost:${port}${c.reset}`);
        open(`http://localhost:${port}`).catch(() => { });
        setTimeout(render, 3000);
    });
}

function saveAndExit() {
    let allValid = true;
    for (const f of FIELDS) {
        if (values[f.key].length > 0 && !f.validate(values[f.key])) {
            allValid = false;
            break;
        }
        if (!values[f.key] && f.default) {
            values[f.key] = f.default;
        }
    }

    if (!allValid) {
        console.log(`\n${c.red}[!] Hay campos con errores [ ✗ ]. Por favor, corrígelos.${c.reset}`);
        setTimeout(render, 2000);
        return;
    }

    let envContent = `# Archivo generado por Introduction Mode\n\n`;
    for (const f of FIELDS) {
        if (values[f.key]) {
            envContent += `${f.key}=${values[f.key]}\n`;
        }
    }

    mkdirSync(SECRETS_DIR, { recursive: true });
    writeFileSync(ENV_PATH, envContent, 'utf8');

    console.log(`\n${c.green}[ ✓ ] Configuración guardada en secrets/.env exitosamente.${c.reset}`);

    if (roleHelperServer) {
        roleHelperServer.close();
    }

    process.stdin.setRawMode(false);
    process.stdin.pause();

    // Devolver el control al archivo que lo llamó
    console.log(`${c.cyan}Iniciando el bot...${c.reset}\n`);
    setTimeout(() => {
        process.exit(0); // Exit clean, start.js will continue if we change how it calls intro
    }, 1000);
}

export function startIntroMode() {
    return new Promise((resolve) => {
        isTyping = false;
        render();

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onData = async (key) => {
            // Ctrl+C
            if (key === '\u0003') {
                process.stdout.write('\x1b[2J\x1b[0;0H');
                process.exit(0);
            }

            // F2 (Role Helper)
            if (key === '\x1bOQ' || key === '\x1b[12~') {
                await startRoleHelper();
                return;
            }

            // F5 (Toggle Secrets)
            if (key === '\x1b[15~') {
                showSecrets = !showSecrets;
                render();
                return;
            }

            if (!isTyping) {
                // Navegación
                if (key === '\u001b[A') { // Up
                    if (currentIndex > 0) currentIndex--;
                    render();
                } else if (key === '\u001b[B') { // Down
                    if (currentIndex < FIELDS.length) currentIndex++;
                    render();
                } else if (key === '\r' || key === '\n') { // Enter
                    if (currentIndex === FIELDS.length) {
                        saveAndExit();
                    } else {
                        isTyping = true;
                        render();
                    }
                }
            } else {
                // Escribiendo
                if (key === '\r' || key === '\n') { // Enter - Stop typing
                    isTyping = false;
                    if (currentIndex < FIELDS.length) currentIndex++;
                    render();
                } else if (key === '\u001b[A' || key === '\u001b[B') { // Arrows while typing = ignore or stop typing
                    isTyping = false;
                    render();
                } else if (key === '\u007f' || key === '\b') { // Backspace
                    const f = FIELDS[currentIndex];
                    values[f.key] = values[f.key].slice(0, -1);
                    render();
                } else if (!key.startsWith('\u001b')) { // Normal chars or Paste
                    const f = FIELDS[currentIndex];
                    // Remove any newlines from pasted content
                    values[f.key] += key.replace(/[\r\n]/g, '');
                    render();
                }
            }
        };

        process.stdin.on('data', onData);

        // Redefinimos saveAndExit para resolver la promesa
        const originalSave = saveAndExit;
        saveAndExit = () => {
            let allValid = true;
            for (const f of FIELDS) {
                if (values[f.key].length > 0 && !f.validate(values[f.key])) {
                    allValid = false;
                    break;
                }
                if (!values[f.key] && f.default) {
                    values[f.key] = f.default;
                }
            }

            if (!allValid) {
                console.log(`\n${c.red}[!] Hay campos con errores [ ✗ ]. Por favor, corrígelos.${c.reset}`);
                setTimeout(render, 2000);
                return;
            }

            let envContent = `# Archivo generado por Introduction Mode\n\n`;
            for (const f of FIELDS) {
                if (values[f.key]) {
                    envContent += `${f.key}=${values[f.key]}\n`;
                }
            }

            mkdirSync(SECRETS_DIR, { recursive: true });
            writeFileSync(ENV_PATH, envContent, 'utf8');

            console.log(`\n${c.green}[ ✓ ] Configuración guardada en secrets/.env exitosamente.${c.reset}`);

            if (roleHelperServer) {
                roleHelperServer.close();
            }

            process.stdin.removeListener('data', onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();

            console.log(`${c.cyan}Todo listo, continuando...${c.reset}\n`);
            setTimeout(() => {
                resolve();
            }, 1000);
        };
    });
}

// Si se ejecuta directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startIntroMode().then(() => process.exit(0));
}
