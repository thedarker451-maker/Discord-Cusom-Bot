#!/usr/bin/env node
/**
 * Custom Discord Bot — Launcher con interfaz en terminal.
 * Menú interactivo, telemetría en vivo, consola de logs y errores.
 * Controles: [←] volver · [↑↓] scroll · [q] menú · [t] detener · [l] logs · [e] errores
 */












































































































// Hola no toques nada de aqui lo podrias dañar. Si no sabes no toques porfabor.
// Este es un bot de discord personalizado con interfaz en terminal.

import { createReadStream, existsSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { spawn, execSync } from 'child_process';
import https from 'https';
import http from 'http';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const STATUS_FILE = join(ROOT, 'secrets', 'bot-status.json');
const BOT_NAME = 'Custom Discord Bot';
const LAUNCHER_VERSION = '3.5.0';
const BUILD = 15.2;

const SECURITY_JSON_URL = 'https://raw.githubusercontent.com/thedarker451-maker/Discord-Cusom-Bot/refs/heads/main/vrs.security/safe.build.json';
const SECURITY_CHECK_TIMEOUT = 5000;
const SECURITY_WARNING_SECONDS = 10;

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const c = {
  reset: (s) => `${colors.reset}${s}`,
  bold: (s) => `${colors.bold}${s}`,
  dim: (s) => `${colors.dim}${s}`,
  red: (s) => `${colors.red}${s}${colors.reset}`,
  green: (s) => `${colors.green}${s}${colors.reset}`,
  yellow: (s) => `${colors.yellow}${s}${colors.reset}`,
  blue: (s) => `${colors.blue}${s}${colors.reset}`,
  magenta: (s) => `${colors.magenta}${s}${colors.reset}`,
  cyan: (s) => `${colors.cyan}${s}${colors.reset}`,
  white: (s) => `${colors.white}${s}${colors.reset}`,
  boldCyan: (s) => `${colors.bold}${colors.cyan}${s}${colors.reset}`,
  boldYellow: (s) => `${colors.bold}${colors.yellow}${s}${colors.reset}`,
  boldRed: (s) => `${colors.bold}${colors.red}${s}${colors.reset}`,
  boldGreen: (s) => `${colors.bold}${colors.green}${s}${colors.reset}`,
  boldMagenta: (s) => `${colors.bold}${colors.magenta}${s}${colors.reset}`,
  boldWhite: (s) => `${colors.bold}${colors.white}${s}${colors.reset}`,
};

let botProcess = null;
let viewMode = 'menu';
let navHistory = [];
let logLines = [];
let errorLines = [];
let logScrollOffset = 0;
let errorScrollOffset = 0;
let lastSize = { cols: 0, rows: 0 };
let menuDeadline = 0;
let pendingChoice = null;

const ERROR_PATTERN = /error|traceback|exception|\[!]|failed|fatal|uncaught|unhandled/i;

function parseVersion(value) {
  value = value.trim();
  const match = value.match(/^(>=|<=|>|<)?\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (!match) throw new Error(`Formato de versión no reconocido: ${value}`);
  return { op: match[1] || '', num: parseFloat(match[2]) };
}

function versionMatches(build, spec) {
  const { op, num } = parseVersion(spec);
  switch (op) {
    case '>': return build > num;
    case '<': return build < num;
    case '>=': return build >= num;
    case '<=': return build <= num;
    default: return build === num;
  }
}

function fetchSecurityJSON(timeout = SECURITY_CHECK_TIMEOUT) {
  return new Promise((resolve) => {
    const protocol = SECURITY_JSON_URL.startsWith('https') ? https : http;
    const req = protocol.get(SECURITY_JSON_URL, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function cancellableWarning(message, seconds = SECURITY_WARNING_SECONDS) {
  console.log(message);
  console.log(c.dim(`(Este aviso se cerrará solo en ${seconds}s. Presiona Ctrl+D para continuar ahora.)`));

  return new Promise((resolve) => {
    let done = false;
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      const onData = (key) => {
        if (key === '\x04' || key === '\x03') { // Ctrl+D or Ctrl+C
          cleanup();
          resolve();
        }
      };
      const cleanup = () => {
        done = true;
        stdin.removeListener('data', onData);
        if (stdin.isTTY) stdin.setRawMode(wasRaw);
      };
      stdin.on('data', onData);
      setTimeout(() => { if (!done) { cleanup(); resolve(); } }, seconds * 1000);
    } else {
      setTimeout(resolve, seconds * 1000);
    }
  });
}

async function checkBuildSecurity() {
  const data = await fetchSecurityJSON();
  if (!data) return;

  const remoteUpdate = String(data['Update'] || '').trim();
  const safeBuildSpec = String(data['Safe Build'] || '').trim();
  const badBuildSpec = String(data['Unsafery Build'] || '').trim();

  let isBad = false;
  let isSafe = false;

  try {
    if (badBuildSpec) isBad = versionMatches(BUILD, badBuildSpec);
    if (safeBuildSpec) isSafe = versionMatches(BUILD, safeBuildSpec);
  } catch { /* spec mal formado */ }

  if (isBad) {
    await cancellableWarning(
      `\n${c.boldRed('[!] [SEGURIDAD]')} Tu build actual (${BUILD}) coincide con una build ` +
      `marcada como INSEGURA (${badBuildSpec}).\n` +
      `Se recomienda actualizar a la build segura (${safeBuildSpec || '—'}).`
    );
  }

  const normRemote = normalizeVersion(remoteUpdate);
  const normLocal = normalizeVersion(LAUNCHER_VERSION);
  const updateOk = !remoteUpdate || compareVersions(normRemote, normLocal) === 0;

  if (!updateOk) {
    await cancellableWarning(
      `\n${c.boldYellow('[!] [ACTUALIZACIÓN]')} Tu versión local (${LAUNCHER_VERSION}) no está ` +
      `sincronizada con la última versión publicada (${remoteUpdate}).\n` +
      `Considera actualizar el launcher.`
    );
  }
}

function normalizeVersion(v) {
  return v.split(/[.\-]/).filter(Boolean).map((p) => parseInt(p) || 0);
}

function compareVersions(a, b) {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function termSize() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  return { cols, rows };
}

function isBigTerminal() {
  const { cols, rows } = termSize();
  return cols >= 100 && rows >= 28;
}

function fmtUptime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function readStatus() {
  try {
    if (existsSync(STATUS_FILE)) {
      return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { online: false };
}

function isErrorLine(line) {
  return ERROR_PATTERN.test(line);
}

function checkRequirements() {
  const rows = [];
  let ok = true;

  let nodeOk = false;
  let nodeVer = '';
  try {
    nodeVer = execSync('node -v', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVer.replace('v', '').split('.')[0]);
    nodeOk = major >= 18;
  } catch { /* not installed */ }
  rows.push(['Node.js 18+', nodeVer || 'No instalado', nodeOk ? 'ok' : 'fail']);
  ok = ok && nodeOk;

  const pyVer = `${process.version}`;
  const pyOk = true; // No longer need Python
  rows.push(['Node.js Runtime', pyVer, 'ok']);
  ok = ok && pyOk;

  let ramGB = 4.0;
  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf-8');
    const match = meminfo.match(/MemTotal:\s+(\d+)/);
    if (match) ramGB = parseInt(match[1]) / 1024 / 1024;
  } catch { /* ignore */ }
  const ramOk = ramGB >= 1.0;
  rows.push(['RAM ≥ 1 GB', `${ramGB.toFixed(1)} GB`, ramOk ? 'ok' : 'warn']);
  ok = ok && ramOk;

  let diskGB = 0;
  try {
    const st = statSync(ROOT);
    diskGB = st.blksize ? (st.blksize / (1024 ** 3)) : 10;
  } catch { diskGB = 10; }
  rows.push(['Disco libre ≥ 0.5 GB', `${diskGB.toFixed(1)} GB`, diskGB >= 0.5 ? 'ok' : 'warn']);

  const envExists = existsSync(join(ROOT, 'secrets', '.env'));
  rows.push(['secrets/.env', envExists ? 'Presente' : 'Falta', envExists ? 'ok' : 'warn']);
  rows.push(['Sistema', `${os.platform()} ${os.release()}`, 'ok']);
  rows.push(['Arquitectura', os.arch(), 'ok']);

  return { rows, ok };
}

function buildRequirementsTable(rows, compact) {
  const show = compact ? rows.slice(0, 4) : rows;
  const width = Math.min(process.stdout.columns || 80, 80);
  let table = `  ${c.bold('Requisito').padEnd(25)} ${c.bold('Estado').padEnd(20)} ${c.bold('OK')}\n`;
  table += `  ${c.dim('─'.repeat(width - 4))}\n`;

  for (const [req, val, status] of show) {
    const mark = status === 'ok' ? c.green('✓') : status === 'fail' ? c.red('✕') : c.yellow('!');
    table += `  ${req.padEnd(25)} ${val.padEnd(20)} ${mark}\n`;
  }

  if (compact && rows.length > 4) {
    table += `  ${c.dim('…'.padEnd(25))} ${c.dim(`+${rows.length - 4} más`).padEnd(20)}\n`;
  }
  return table;
}

function buildBox(title, content) {
  const width = Math.min(process.stdout.columns || 80, 80);
  let box = `${c.boldCyan(title)}\n`;
  box += `${c.dim('─'.repeat(width))}\n`;
  box += content;
  return box;
}

function splashAnimation() {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map(f => `  ${c.cyan(f)} Iniciando...`);
  const width = Math.min(process.stdout.columns || 80, 80);
  const logo = `\n${c.boldCyan(BOT_NAME)} (v${LAUNCHER_VERSION})\n${c.dim('─'.repeat(width))}`;

  process.stdout.write('\x1B[2J\x1B[0f'); // clear screen
  process.stdout.write('\x1B[?25l'); // hide cursor

  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${frames[i % frames.length]}   `);
      i++;
      if (i >= 30) {
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(40) + '\r');
        console.log(logo);
        console.log();
        resolve();
      }
    }, 25);
  });
}

function taskAnimation(label, success) {
  const icon = success ? c.green('✓') : c.red('✕');
  const color = success ? 'green' : 'red';
  process.stdout.write(`\r${c.bold(label)}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      process.stdout.write(`\r${icon} ${label}           \n`);
      resolve();
    }, 450);
  });
}

function farewellPanel() {
  const st = readStatus();
  const width = Math.min(process.stdout.columns || 80, 80);
  console.log();
  console.log(c.boldMagenta('Sesión finalizada'));
  console.log(c.dim('─'.repeat(width)));
  console.log(`  Gracias por usar ${c.boldMagenta(BOT_NAME)}`);
  console.log();
  console.log(`  Estado final:  ${c.boldRed('Offline')}`);
  console.log(`  Última sesión: ${(st.tag || '—')}`);
  console.log(`  Hasta pronto.`);
  console.log(c.dim('─'.repeat(width)));
  console.log();
}

function buildMenuRender(compact) {
  const { rows: reqRows, ok: allOk } = checkRequirements();
  const st = readStatus();
  const lbUrl = st.leaderboardUrl || '';

  let navIndicator = '';
  if (navHistory.length > 0) {
    navIndicator = c.dim(`  ← [${navHistory[navHistory.length - 1]}] volver`) + '\n';
  }

  let menuText = '';
  if (navIndicator) menuText += navIndicator + '\n';
  menuText += `  ${c.boldYellow('[1]')} Iniciar el bot  ${c.dim('(default · 5s)')}\n`;
  menuText += `  ${c.boldYellow('[2]')} Restablecer clave de encriptación\n`;
  menuText += `  ${c.boldYellow('[3]')} Solo encriptar variables del .env\n`;
  menuText += `  ${c.boldMagenta('[p]')} Perfil / telemetría\n`;
  menuText += `  ${c.boldGreen('[l]')} Consola de logs\n`;
  menuText += `  ${c.boldRed('[e]')} Errores del bot\n`;

  if (lbUrl) {
    menuText += `\n  Leaderboard: ${c.cyan(lbUrl)}\n`;
  }
  if (!allOk) {
    menuText += `\n  ${c.boldRed('[!] Algunos requisitos no se cumplen.')}\n`;
  }

  const parts = [];
  const width = Math.min(process.stdout.columns || 80, 80);
  parts.push(`\n${c.boldCyan(BOT_NAME)} (v${LAUNCHER_VERSION})\n${c.dim('─'.repeat(width))}`);
  parts.push(buildBox('Menú principal', menuText));
  parts.push(buildBox('Requisitos del sistema', buildRequirementsTable(reqRows, compact)));

  if (!compact) {
    parts.push(buildBox('Controles', `  ${c.boldYellow('[q]')} menú · ${c.boldYellow('[t]')} detener · ${c.boldGreen('[l]')} logs · ${c.boldRed('[e]')} errores · ${c.boldYellow('[Ctrl+C]')} salir`));
  }

  return parts.join('\n\n');
}

function buildProfileRender(compact) {
  const st = readStatus();
  const online = st.online || false;
  const { cols, rows: termRows } = termSize();

  let navInfo = '';
  if (navHistory.length > 0) {
    navInfo = c.dim(`  ← [${navHistory[navHistory.length - 1]}]`);
  }

  const info = [
    ['Estado', online ? c.green('Online') : c.red('Offline / Conectando')],
    ['Bot', st.tag || '—'],
    ['Ping', `${st.ping || 0} ms`],
    ['Servidores', String(st.guilds || 0)],
    ['Usuarios', String(st.users || 0)],
    ['Uptime', fmtUptime(st.uptime || 0)],
  ];

  if (st.leaderboardUrl) info.push(['Leaderboard', c.cyan(st.leaderboardUrl)]);
  if (st.dashboardUrl) info.push(['Dashboard', c.cyan(st.dashboardUrl)]);
  if (!compact) {
    info.push(['SO', st.os || os.platform()]);
    info.push(['Node', st.node || '—']);
    info.push(['RAM bot', `${st.memoryMb || 0} MB`]);
    info.push(['Terminal', `${cols}×${termRows} ${isBigTerminal() ? '[Big]' : '[Compact]'}`]);
  }

  let table = '';
  for (const [key, val] of info) {
    table += `  ${c.cyan(key.padEnd(15))} ${val}\n`;
  }

  const controls = `  ${c.boldYellow('[←]')} Volver  ${c.boldYellow('[q]')} Menú  ${c.boldRed('[t]')} Detener  ${c.boldGreen('[l]')} Logs  ${c.boldRed('[e]')} Errores`;

  const parts = [];
  const width = Math.min(process.stdout.columns || 80, 80);
  parts.push(`\n${c.boldCyan('Perfil en vivo')} ${navInfo}\n${c.dim('─'.repeat(width))}`);
  parts.push(buildBox('Telemetría', table));
  parts.push(buildBox('Controles', controls));

  return parts.join('\n\n');
}

function buildLogsRender() {
  const running = botProcess && !botProcess.killed;
  const status = running ? c.green('Bot activo') : c.red('Bot detenido');

  let navInfo = '';
  if (navHistory.length > 0) {
    navInfo = c.dim(`  ← [${navHistory[navHistory.length - 1]}]`);
  }

  const header = `Consola en tiempo real · ${status} ${navInfo}`;

  let content;
  if (logLines.length > 0) {
    const visible = 18;
    const total = logLines.length;
    const maxOffset = Math.max(0, total - visible);
    const offset = Math.max(0, Math.min(logScrollOffset, maxOffset));
    const start = Math.max(0, total - visible - offset);
    const end = total - offset;
    const tail = logLines.slice(start, end);

    let scrollInfo = '';
    if (total > visible) {
      scrollInfo = c.dim(`  (${offset + 1}-${Math.min(offset + visible, total)}/${total})`);
    }

    content = tail.map((line) => isErrorLine(line) ? c.red(line) : c.dim(line)).join('\n');
    if (offset > 0) content = c.dim('  ↑ Más arriba...') + '\n' + content;
    if (offset < maxOffset) content += '\n' + c.dim('  ↓ Más abajo...');

    return buildBox(header + scrollInfo, content);
  } else {
    content = c.dim('  Esperando salida del bot... Inicia con [1] o espera el auto-start.');
    return buildBox(header, content);
  }
}

function buildErrorsRender() {
  let navInfo = '';
  if (navHistory.length > 0) {
    navInfo = c.dim(`  ← [${navHistory[navHistory.length - 1]}]`);
  }

  const header = `Errores del bot · ${c.yellow(`${errorLines.length} registrados`)} ${navInfo}`;

  let content;
  if (errorLines.length > 0) {
    const visible = 18;
    const total = errorLines.length;
    const maxOffset = Math.max(0, total - visible);
    const offset = Math.max(0, Math.min(errorScrollOffset, maxOffset));
    const start = Math.max(0, total - visible - offset);
    const end = total - offset;
    const tail = errorLines.slice(start, end);

    let scrollInfo = '';
    if (total > visible) {
      scrollInfo = c.dim(`  (${offset + 1}-${Math.min(offset + visible, total)}/${total})`);
    }

    content = tail.map((line) => c.red(line)).join('\n');
    if (offset > 0) content = c.dim('  ↑ Más arriba...') + '\n' + content;
    if (offset < maxOffset) content += '\n' + c.dim('  ↓ Más abajo...');

    return buildBox(header + scrollInfo, content);
  } else {
    content = c.dim('  Sin errores por ahora. Los mensajes con [!], Error o Traceback aparecen aquí.');
    return buildBox(header, content);
  }
}

function getRender() {
  switch (viewMode) {
    case 'profile': return buildProfileRender(!isBigTerminal());
    case 'logs': return buildLogsRender();
    case 'errors': return buildErrorsRender();
    default: return buildMenuRender(!isBigTerminal());
  }
}

function updateScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
  process.stdout.write(getRender());
}

function ensureDependencies() {
  if (!existsSync(join(ROOT, 'node_modules'))) {
    taskAnimation('Instalando dependencias npm', true);
    return spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit' });
  }
  return true;
}

function encryptEnv() {
  taskAnimation('Encriptando variables del .env', true);
  spawnSync('node', ['scr/security-helper.js', '--encrypt'], { cwd: ROOT, stdio: 'inherit' });
}

function resetKey() {
  console.log(c.boldRed('[!] Esto eliminará secrets/.key y desencriptará el .env'));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question(c.yellow('¿Confirmar? (s/N): '), (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === 's') {
      taskAnimation('Restablecimiento de clave', spawnSync('node', ['scr/security-helper.js', '--reset'], { cwd: ROOT }).status === 0);
    } else {
      console.log(c.blue('Operación cancelada.'));
    }
  });
}

function spawnSync(cmd, args, opts) {
  try {
    return execSync(`${cmd} ${args.join(' ')}`, { cwd: opts.cwd, stdio: 'pipe' });
  } catch (e) {
    return { status: e.status || 1 };
  }
}

function freeDashboardPort() {
  const port = process.env.PORT || '3000';
  try {
    const out = execSync(`lsof -ti tcp:${port} 2>/dev/null || true`, { encoding: 'utf-8' }).trim();
    if (out) {
      for (const pid of out.split('\n')) {
        try { execSync(`kill -9 ${pid} 2>/dev/null || true`); } catch { /* ignore */ }
      }
      taskAnimation(`Puerto ${port} liberado`, true);
    }
  } catch { /* ignore */ }
}

function startBotProcess() {
  if (botProcess && !botProcess.killed) return true;

  const envFile = join(ROOT, 'secrets', '.env');
  const exampleFile = join(ROOT, 'secrets', '.env.example');
  if (!existsSync(envFile) && existsSync(exampleFile)) {
    copyFileSync(exampleFile, envFile);
  }

  if (!existsSync(join(ROOT, 'node_modules'))) {
    taskAnimation('Error al instalar dependencias', false);
    return false;
  }

  encryptEnv();
  freeDashboardPort();
  logLines.length = 0;
  errorLines.length = 0;

  botProcess = spawn('npm', ['start'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });

  botProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        logLines.push(trimmed);
        if (isErrorLine(trimmed)) errorLines.push(trimmed);
      }
    }
  });

  botProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        errorLines.push(trimmed);
        logLines.push(trimmed);
      }
    }
  });

  taskAnimation('Bot iniciado', true);
  return true;
}

function stopBot(animate = true) {
  if (botProcess && !botProcess.killed) {
    botProcess.kill('SIGTERM');
    setTimeout(() => {
      if (!botProcess.killed) botProcess.kill('SIGKILL');
    }, 5000);

    if (animate) {
      taskAnimation('Bot detenido', true);
    } else {
      console.log(c.green('✓') + ' Bot detenido');
    }
  }
  botProcess = null;
  try {
    writeFileSync(STATUS_FILE, JSON.stringify({ online: false }, null, 2));
  } catch { /* ignore */ }
}

function navigateTo(newView) {
  if (newView === viewMode) return;
  navHistory.push(viewMode);
  if (navHistory.length > 20) navHistory.shift();
  viewMode = newView;
  logScrollOffset = 0;
  errorScrollOffset = 0;
}

function navigateBack() {
  if (navHistory.length > 0) {
    viewMode = navHistory.pop();
  } else {
    viewMode = 'menu';
  }
  logScrollOffset = 0;
  errorScrollOffset = 0;
}

function handleMenuChoice(choice) {
  if (choice === '1' || choice === '') {
    if (startBotProcess()) navigateTo('profile');
  } else if (choice === '2') {
    stopBot();
    resetKey();
  } else if (choice === '3') {
    encryptEnv();
  } else if (choice === 'p') {
    if (botProcess && !botProcess.killed) {
      navigateTo('profile');
    } else {
      console.log(c.yellow('El bot no está en ejecución.'));
      setTimeout(() => { }, 1200);
    }
  } else if (choice === 'l') {
    navigateTo('logs');
  } else if (choice === 'e') {
    navigateTo('errors');
  }
}

function handleProfileKey(key) {
  if (key === 'q' || key === 'left') {
    navigateBack();
    return 'menu';
  }
  if (key === 't') return 'stop';
  if (key === 'l') navigateTo('logs');
  if (key === 'e') navigateTo('errors');
  return null;
}

async function main() {
  await checkBuildSecurity();
  await splashAnimation();
  lastSize = termSize();
  menuDeadline = Date.now() + 5000;

  process.stdout.write('\x1B[?25l'); // hide cursor
  updateScreen();

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('error', (err) => {
      if (err.code === 'EIO') {
        // Terminal disconnected or I/O error - silently ignore
        return;
      }
      console.error('stdin error:', err.message);
    });

    process.stdin.on('data', (key) => {
      try {
        if (key === '\x03') { // Ctrl+C
          cleanup();
          process.exit(0);
        }
        if (key === '\x04') { // Ctrl+D
          // skip
          return;
        }

        if (viewMode === 'profile') {
          const action = handleProfileKey(key);
          if (action === 'menu') {
            menuDeadline = Date.now() + 999999;
            updateScreen();
          } else if (action === 'stop') {
            stopBot(true);
            navigateTo('menu');
            menuDeadline = Date.now() + 5000;
            updateScreen();
          } else {
            updateScreen();
          }
        } else if (viewMode === 'logs' || viewMode === 'errors') {
          if (key === 'q' || key === 'left') {
            navigateBack();
            updateScreen();
          } else if (key === 'up') {
            if (viewMode === 'logs') {
              logScrollOffset = Math.min(logScrollOffset + 3, Math.max(0, logLines.length - 18));
            } else {
              errorScrollOffset = Math.min(errorScrollOffset + 3, Math.max(0, errorLines.length - 18));
            }
            updateScreen();
          } else if (key === 'down') {
            if (viewMode === 'logs') {
              logScrollOffset = Math.max(0, logScrollOffset - 3);
            } else {
              errorScrollOffset = Math.max(0, errorScrollOffset - 3);
            }
            updateScreen();
          } else if (key === 'p' && botProcess && !botProcess.killed) {
            navigateTo('profile');
            updateScreen();
          } else if (key === 'l') {
            navigateTo('logs');
            updateScreen();
          } else if (key === 'e') {
            navigateTo('errors');
            updateScreen();
          } else if (key === 't' && botProcess && !botProcess.killed) {
            stopBot(true);
            navigateTo('menu');
            menuDeadline = Date.now() + 5000;
            updateScreen();
          }
        } else if (viewMode === 'menu' && '123ple'.includes(key)) {
          pendingChoice = key;
          menuDeadline = 0;
        } else if (viewMode === 'menu' && key === 'left') {
          if (navHistory.length > 0) navigateBack();
          updateScreen();
        }
      } catch {}
    });
  }

  const loop = setInterval(() => {
    if (viewMode === 'menu' && pendingChoice !== null) {
      const choice = pendingChoice;
      pendingChoice = null;
      handleMenuChoice(choice);
      menuDeadline = Date.now() + (viewMode !== 'menu' ? 999999 : 5000);
      updateScreen();
    }

    if (viewMode === 'menu' && Date.now() >= menuDeadline) {
      handleMenuChoice('1');
      navigateTo('profile');
      menuDeadline = Date.now() + 999999;
      updateScreen();
    }

    // Auto-refresh for profile view
    if (viewMode === 'profile') {
      updateScreen();
    }
  }, viewMode === 'profile' ? 200 : 120);

  process.on('SIGINT', () => {
    try { cleanup(); } catch {}
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    try { cleanup(); } catch {}
    process.exit(0);
  });

  process.on('uncaughtException', (err) => {
    if (err.code === 'EIO' || err.message?.includes('EIO')) {
      // Terminal I/O error - silently ignore
      return;
    }
    console.error('Uncaught exception:', err.message);
  });

  function cleanup() {
    process.stdout.write('\x1B[?25h'); // show cursor
    stopBot(false);
    farewellPanel();
  }
}

main().catch(() => {
  process.stdout.write('\x1B[?25h');
  stopBot(false);
  farewellPanel();
});