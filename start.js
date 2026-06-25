#!/usr/bin/env node
/**
 * Custom Discord Bot — Instalador y Launcher
 * Solo maneja: instalación de requisitos, verificación de herramientas,
 * búsqueda de actualizaciones en GitHub Releases, y arranque del bot.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = __dirname;

// ── Colores ANSI ─────────────────────────────────────────────
const ESC = '\x1b[';
const c = {
    reset: `${ESC}0m`,
    bold: `${ESC}1m`,
    dim: `${ESC}2m`,
    red: `${ESC}31m`,
    green: `${ESC}32m`,
    yellow: `${ESC}33m`,
    blue: `${ESC}34m`,
    magenta: `${ESC}35m`,
    cyan: `${ESC}36m`,
    white: `${ESC}37m`,
    bgBlack: `${ESC}40m`,
};

// Degradado azul (claro → oscuro)
const BLUE_GRADIENT = [
    `${ESC}38;2;100;180;255m`,  // azul claro
    `${ESC}38;2;80;160;240m`,
    `${ESC}38;2;60;140;220m`,
    `${ESC}38;2;50;120;200m`,
    `${ESC}38;2;40;100;180m`,
    `${ESC}38;2;30;80;160m`,   // azul oscuro
];

// ── GitHub Config ────────────────────────────────────────────
const GITHUB_REPO = 'thedarker451-maker/Discord-Custom-Bot';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// ── ASCII Art ────────────────────────────────────────────────
const DISCORD_CUSTOM_ART = [
    ' ██████╗  ██╗ ███████╗  ██████╗  ██████╗  ██████╗  ██████╗       ██████╗ ██╗   ██╗ ███████╗ ████████╗  ██████╗  ███╗   ███╗',
    ' ██╔══██╗ ██║ ██╔════╝ ██╔════╝ ██╔═══██╗ ██╔══██╗ ██╔══██╗     ██╔════╝ ██║   ██║ ██╔════╝ ╚══██╔══╝ ██╔═══██╗ ████╗ ████║',
    ' ██║  ██║ ██║ ███████╗ ██║      ██║   ██║ ██████╔╝ ██║  ██║     ██║      ██║   ██║ ███████╗    ██║    ██║   ██║ ██╔████╔██║',
    ' ██║  ██║ ██║ ╚════██║ ██║      ██║   ██║ ██╔══██╗ ██║  ██║     ██║      ██║   ██║ ╚════██║    ██║    ██║   ██║ ██║╚██╔╝██║',
    ' ██████╔╝ ██║ ███████║ ╚██████╗ ╚██████╔╝ ██║  ██║ ██████╔╝     ╚██████╗ ╚██████╔╝ ███████║    ██║    ╚██████╔╝ ██║ ╚═╝ ██║',
    ' ╚═════╝  ╚═╝ ╚══════╝  ╚═════╝  ╚═════╝  ╚═╝  ╚═╝ ╚═════╝       ╚═════╝  ╚═════╝  ╚══════╝    ╚═╝     ╚═════╝  ╚═╝     ╚═╝',
];

const BOT_ART = [
    ' ██████╗   ██████╗  ████████╗',
    ' ██╔══██╗ ██╔═══██╗ ╚══██╔══╝',
    ' ██████╔╝ ██║   ██║    ██║   ',
    ' ██╔══██╗ ██║   ██║    ██║   ',
    ' ██████╔╝ ╚██████╔╝    ██║   ',
    ' ╚═════╝   ╚═════╝     ╚═╝   ',
];

// ── Utilidades ───────────────────────────────────────────────
function getTermWidth() {
    return process.stdout.columns || 80;
}

function centerText(text, width) {
    const visibleLen = text.replace(/\x1b\[[0-9;]*m/g, '').length;
    const pad = Math.max(0, Math.floor((width - visibleLen) / 2));
    return ' '.repeat(pad) + text;
}

function printCentered(line, color = '') {
    const width = getTermWidth();
    const reset = c.reset;
    console.log(centerText(`${color}${line}${reset}`, width));
}

function printBanner() {
    console.clear();
    const width = getTermWidth();
    console.log('');

    // DISCORD CUSTOM — con degradado azul
    DISCORD_CUSTOM_ART.forEach((line, i) => {
        const gradientColor = BLUE_GRADIENT[i] || BLUE_GRADIENT[BLUE_GRADIENT.length - 1];
        printCentered(line, gradientColor);
    });

    console.log('');

    // BOT — centrado, con degradado azul (continuando)
    BOT_ART.forEach((line, i) => {
        const gradientColor = BLUE_GRADIENT[i] || BLUE_GRADIENT[BLUE_GRADIENT.length - 1];
        printCentered(line, gradientColor);
    });

    // Versión centrada
    const version = getLocalVersion();
    printCentered(`(v${version})`, c.dim);
    console.log('');
}

function getLocalVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
        return pkg.version || '1.0.0';
    } catch {
        return '1.0.0';
    }
}

function log(icon, msg, color = c.white) {
    console.log(`  ${color}[ ${icon} ]${c.reset} ${msg}`);
}

function logOk(msg) { log('✓', msg, c.green); }
function logFail(msg) { log('✗', msg, c.red); }
function logWarn(msg) { log('!', msg, c.yellow); }
function logInfo(msg) { log('…', msg, c.cyan); }

// ── Spinner simple ───────────────────────────────────────────
function createSpinner(text) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r  ${c.cyan}${frames[i % frames.length]}${c.reset} ${text}   `);
        i++;
    }, 80);
    return {
        succeed(msg) {
            clearInterval(interval);
            process.stdout.write(`\r  ${c.green}✓${c.reset} ${msg || text}             \n`);
        },
        fail(msg) {
            clearInterval(interval);
            process.stdout.write(`\r  ${c.red}✗${c.reset} ${msg || text}             \n`);
        },
        stop() { clearInterval(interval); process.stdout.write('\r' + ' '.repeat(60) + '\r'); }
    };
}

// ── Verificación de requisitos ───────────────────────────────
function checkNode() {
    try {
        const ver = process.version;
        const major = parseInt(ver.replace('v', '').split('.')[0]);
        if (major >= 18) {
            logOk(`Node.js ${ver} detectado`);
            return true;
        } else {
            logFail(`Node.js ${ver} es muy antigua. Se requiere v18+`);
            return false;
        }
    } catch {
        logFail('Node.js no encontrado');
        return false;
    }
}

function checkGit() {
    try {
        const ver = execSync('git --version', { encoding: 'utf-8' }).trim();
        logOk(`${ver}`);
        return true;
    } catch {
        logWarn('Git no encontrado (opcional para auto-updates)');
        return true; // git es opcional
    }
}

function checkTermux() {
    const isTermux = existsSync('/data/data/com.termux/files/usr') || process.env.TERMUX_VERSION;
    if (isTermux) {
        logInfo('Entorno Termux detectado');
        // Instalar herramientas faltantes
        try {
            if (!commandExists('git')) {
                execSync('pkg install -y git', { stdio: 'pipe' });
            }
        } catch { /* ignore */ }
    }
    return isTermux;
}

function commandExists(cmd) {
    try {
        execSync(`which ${cmd}`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function checkRAM() {
    const totalGB = os.totalmem() / (1024 ** 3);
    if (totalGB >= 1.0) {
        logOk(`RAM: ${totalGB.toFixed(1)} GB`);
    } else {
        logWarn(`RAM: ${totalGB.toFixed(1)} GB (se recomienda ≥1 GB)`);
    }
    return totalGB >= 0.5;
}

function checkEnv() {
    const secretsEnv = join(ROOT, 'secrets', '.env');
    const rootEnv = join(ROOT, '.env');

    if (existsSync(secretsEnv)) {
        logOk('secrets/.env encontrado');
        return true;
    } else if (existsSync(rootEnv)) {
        // Migrar .env raíz a secrets/
        logWarn('.env encontrado en raíz, migrando a secrets/.env...');
        mkdirSync(join(ROOT, 'secrets'), { recursive: true });
        copyFileSync(rootEnv, secretsEnv);
        logOk('Migrado .env → secrets/.env');
        return true;
    } else {
        const example = join(ROOT, '.env.example');
        if (existsSync(example)) {
            mkdirSync(join(ROOT, 'secrets'), { recursive: true });
            copyFileSync(example, secretsEnv);
            logWarn('secrets/.env creado desde .env.example — configúralo antes de iniciar');
        } else {
            logFail('No se encontró secrets/.env ni .env.example');
        }
        return false;
    }
}

// ── Instalación de dependencias ──────────────────────────────
async function installDependencies() {
    if (existsSync(join(ROOT, 'node_modules'))) {
        logOk('Dependencias ya instaladas');
        return true;
    }

    const spinner = createSpinner('Instalando dependencias (npm install)...');
    try {
        execSync('npm install --omit=dev', {
            cwd: ROOT,
            stdio: 'pipe',
            timeout: 120000
        });
        spinner.succeed('Dependencias instaladas correctamente');
        return true;
    } catch (err) {
        spinner.fail('Error al instalar dependencias');
        console.error(`  ${c.dim}${err.message}${c.reset}`);
        return false;
    }
}

// ── Buscar actualizaciones en GitHub Releases ────────────────
function checkGitHubRelease() {
    return new Promise((resolve) => {
        const spinner = createSpinner('Buscando actualizaciones en GitHub...');

        const options = {
            headers: { 'User-Agent': 'CustomDiscordBot-Launcher' },
            timeout: 8000
        };

        const req = https.get(GITHUB_API, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const remoteVersion = (release.tag_name || '').replace(/^v/, '');
                    const localVersion = getLocalVersion();

                    if (remoteVersion && remoteVersion !== localVersion) {
                        spinner.succeed(`Actualización disponible: v${localVersion} → v${remoteVersion}`);
                        console.log(`  ${c.cyan}↳${c.reset} ${release.html_url || ''}`);
                        if (release.body) {
                            const notes = release.body.split('\n').slice(0, 3).join('\n    ');
                            console.log(`    ${c.dim}${notes}${c.reset}`);
                        }
                    } else {
                        spinner.succeed(`Estás en la última versión (v${localVersion})`);
                    }
                } catch {
                    spinner.succeed('No se pudo verificar actualizaciones (sin acceso o repo privado)');
                }
                resolve();
            });
        });

        req.on('error', () => { spinner.succeed('Sin conexión para buscar actualizaciones'); resolve(); });
        req.on('timeout', () => { req.destroy(); spinner.succeed('Timeout al buscar actualizaciones'); resolve(); });
    });
}

// ── Menú principal ───────────────────────────────────────────
function showMenu() {
    const width = getTermWidth();
    const line = '─'.repeat(Math.min(width - 4, 60));

    console.log(`  ${c.dim}${line}${c.reset}`);
    console.log('');
    console.log(`  ${c.cyan}[1]${c.reset} ${c.green}▶${c.reset}  Iniciar Bot`);
    console.log(`  ${c.cyan}[2]${c.reset} ${c.yellow}▶${c.reset}  Iniciar Bot ${c.dim}(Desarrollo)${c.reset}`);
    console.log(`  ${c.cyan}[3]${c.reset} ${c.blue}▶${c.reset}  Verificar Requisitos`);
    console.log(`  ${c.cyan}[4]${c.reset} ${c.magenta}▶${c.reset}  Buscar Actualizaciones`);
    console.log(`  ${c.cyan}[5]${c.reset} ${c.cyan}▶${c.reset}  Recargar Comandos`);
    console.log(`  ${c.cyan}[6]${c.reset} ${c.white}▶${c.reset}  Opciones`);
    console.log(`  ${c.cyan}[7]${c.reset} ${c.green}▶${c.reset}  Iniciar Modo Termux (Lite/Eco)`);
    console.log('');
    console.log(`  ${c.dim}[Ctrl+C] salir${c.reset}`);
    console.log(`  ${c.dim}${line}${c.reset}`);
    console.log('');
}

// ── Flujo principal ──────────────────────────────────────────
async function main() {
    printBanner();

    // Verificaciones rápidas
    console.log(`  ${c.bold}${c.white}Verificando sistema...${c.reset}`);
    console.log('');

    checkTermux();
    const nodeOk = checkNode();
    if (!nodeOk) {
        logFail('Node.js 18+ es requerido. Instálalo desde https://nodejs.org');
        process.exit(1);
    }
    checkGit();
    checkRAM();

    // Instalar dependencias
    const depsOk = await installDependencies();
    if (!depsOk) {
        logFail('No se pudieron instalar las dependencias');
        process.exit(1);
    }

    // Buscar actualizaciones
    await checkGitHubRelease();
    console.log('');

    const envOk = checkEnv();
    console.log('');

    if (!envOk) {
        logWarn('Iniciando Introduction Mode...');
        const { startIntroMode } = await import('./scr/intro.js');
        await startIntroMode();
        // Re-verificar después de intro
        if (!existsSync(join(ROOT, 'secrets', '.env'))) {
            logFail('No se configuró secrets/.env correctamente. Saliendo...');
            process.exit(1);
        }
        printBanner();
    }

    // Auto-start?
    const autoMode = process.env.AUTO === 'true';
    if (autoMode) {
        logInfo('Modo AUTO activado — iniciando bot...');
        const bot = spawn('node', ['scr/stared.js'], { cwd: ROOT, stdio: 'inherit' });
        bot.on('exit', (code) => process.exit(code || 0));
        return;
    }

    // Menú interactivo
    showMenu();

    if (!process.stdin.isTTY) {
        logInfo('No hay terminal interactiva — iniciando bot directamente...');
        const bot = spawn('node', ['scr/stared.js'], { cwd: ROOT, stdio: 'inherit' });
        bot.on('exit', (code) => process.exit(code || 0));
        return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', async (key) => {
        if (key === '\x03') { // Ctrl+C
            console.log(`\n  ${c.green}¡Hasta luego! 👋${c.reset}\n`);
            process.exit(0);
        }

        switch (key) {
            case '1': {
                console.log(`\n  ${c.green}Iniciando bot en modo producción...${c.reset}\n`);
                process.stdin.setRawMode(false);
                const bot = spawn('node', ['scr/stared.js'], { cwd: ROOT, stdio: 'inherit' });
                bot.on('exit', (code) => process.exit(code || 0));
                break;
            }
            case '2': {
                console.log(`\n  ${c.yellow}Iniciando bot en modo desarrollo...${c.reset}\n`);
                process.stdin.setRawMode(false);
                const bot = spawn('npx', ['nodemon', 'scr/main.js'], { cwd: ROOT, stdio: 'inherit' });
                bot.on('exit', (code) => process.exit(code || 0));
                break;
            }
            case '3': {
                console.clear();
                printBanner();
                console.log(`  ${c.bold}${c.white}Verificación completa del sistema${c.reset}\n`);
                checkNode();
                checkGit();
                checkRAM();
                checkEnv();
                logOk(`Sistema: ${os.platform()} ${os.release()}`);
                logOk(`Arquitectura: ${os.arch()}`);
                logOk(`CPUs: ${os.cpus().length}`);
                console.log('');
                showMenu();
                break;
            }
            case '4': {
                console.log('');
                await checkGitHubRelease();
                console.log('');
                break;
            }
            case '5': {
                console.log(`\n  ${c.cyan}Recargando comandos slash...${c.reset}`);
                try {
                    execSync('node -e "import(\'./scr/slash-comands.js\')"', { cwd: ROOT, stdio: 'pipe' });
                    logOk('Comandos recargados');
                } catch {
                    logWarn('Usa /reload dentro de Discord para recargar');
                }
                console.log('');
                break;
            }
            case '6': {
                console.clear();
                printBanner();
                console.log(`  ${c.bold}${c.white}⚙️  Opciones${c.reset}\n`);
                console.log(`  ${c.cyan}[a]${c.reset} Editar secrets/.env`);
                console.log(`  ${c.cyan}[b]${c.reset} Encriptar variables`);
                console.log(`  ${c.cyan}[c]${c.reset} Desencriptar variables`);
                console.log(`  ${c.cyan}[d]${c.reset} Volver al menú`);
                console.log('');
                break;
            }
            case '7': {
                console.log(`\n  ${c.green}Iniciando bot en modo Termux (Lite/Eco)...${c.reset}\n`);
                process.env.TERMUX_LITE_MODE = 'true';
                process.stdin.setRawMode(false);
                const bot = spawn('node', ['scr/stared.js'], { cwd: ROOT, stdio: 'inherit' });
                bot.on('exit', (code) => process.exit(code || 0));
                break;
            }
            case 'a': {
                process.stdin.setRawMode(false);
                const editor = commandExists('nano') ? 'nano' : (commandExists('vim') ? 'vim' : null);
                if (editor) {
                    const ed = spawn(editor, [join(ROOT, 'secrets', '.env')], { stdio: 'inherit' });
                    ed.on('exit', () => { process.stdin.setRawMode(true); showMenu(); });
                } else {
                    logWarn('No se encontró editor de texto (nano/vim)');
                    process.stdin.setRawMode(true);
                }
                break;
            }
            case 'b': {
                console.log('');
                try {
                    execSync('node scr/security-helper.js --encrypt', { cwd: ROOT, stdio: 'inherit' });
                } catch { logFail('Error al encriptar'); }
                console.log('');
                break;
            }
            case 'c': {
                console.log('');
                try {
                    execSync('node scr/security-helper.js --decrypt-all', { cwd: ROOT, stdio: 'inherit' });
                } catch { logFail('Error al desencriptar'); }
                console.log('');
                break;
            }
            case 'd': {
                console.clear();
                printBanner();
                showMenu();
                break;
            }
        }
    });
}

main().catch(err => {
    console.error(`${c.red}Error fatal: ${err.message}${c.reset}`);
    process.exit(1);
});
