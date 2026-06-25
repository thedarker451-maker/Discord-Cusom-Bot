import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "redis";
import db from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../secrets/db-local.json");
const BOT_NAME = "Custom Discord Bot";

export function isLeaderboardEnabled() {
    const v = (process.env.LEADERBOARD_ENABLED ?? "true").toLowerCase().trim();
    return v !== "false" && v !== "0" && v !== "no";
}

export function resolvePublicBaseUrl(mainPort) {
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
    }
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`.replace(/\/$/, "");
    }
    if (process.env.PUBLIC_URL) {
        return process.env.PUBLIC_URL.replace(/\/$/, "");
    }
    return `http://localhost:${mainPort}`;
}

function fmtDuration(ms) {
    if (!ms || ms < 0) return "Recién";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}

function fmtUptime(ms) {
    const s = Math.floor((ms || 0) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
}

async function loadLeaderboardEntries(client, limit = 25) {
    let board = [];
    try {
        board = await db.getEconomyLeaderboard(limit);
    } catch {
        board = [];
    }

    if (!board.length && fs.existsSync(DB_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
            board = Object.entries(data)
                .filter(([k]) => k.startsWith("economy:"))
                .map(([k, v]) => ({
                    userId: k.replace("economy:", ""),
                    total: (v.wallet || 0) + (v.bank || 0),
                    wallet: v.wallet || 0,
                    bank: v.bank || 0,
                    firstSeen: v.firstSeen || 0
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, limit);
        } catch {
            board = [];
        }
    }

    const now = Date.now();
    return Promise.all(board.map(async (entry, i) => {
        const user = client ? await client.users.fetch(entry.userId).catch(() => null) : null;
        const name = user?.username || `Usuario ${entry.userId.slice(-4)}`;
        const avatar = user?.displayAvatarURL({ extension: "png", size: 128 })
            || "https://cdn.discordapp.com/embed/avatars/0.png";
        const profileUrl = `https://discord.com/users/${entry.userId}`;
        const since = fmtDuration(now - (entry.firstSeen || now));
        return {
            rank: i + 1,
            name,
            avatar,
            profileUrl,
            since,
            balance: entry.total,
            wallet: entry.wallet,
            bank: entry.bank
        };
    }));
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function checkRedisHealth() {
    const redisUrl = process.env.REDIS_URL || "";
    if (!redisUrl) return null;
    let client = null;
    try {
        client = createClient({ url: redisUrl });
        await client.connect();
        await client.ping();
        return true;
    } catch {
        return false;
    } finally {
        if (client) await client.quit().catch(() => {});
    }
}

// ── HTML: Leaderboard Page ───────────────────────────────────
function buildLeaderboardHtml(entries, baseUrl) {
    const rows = entries.length
        ? entries.map(e => `
            <li class="row">
                <span class="rank">${e.rank}</span>
                <img class="avatar" src="${e.avatar}" alt="">
                <div class="meta">
                    <a class="name" href="${e.profileUrl}" target="_blank" rel="noopener">${escapeHtml(e.name)}</a>
                    <span class="sub">Desde hace ${escapeHtml(e.since)} · <strong>${e.balance.toLocaleString()} NC</strong></span>
                </div>
            </li>`).join("")
        : `<li class="empty">Aún no hay jugadores en el ranking. Usa <code>/daily</code> para empezar.</li>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leaderboard — ${BOT_NAME}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, system-ui, sans-serif; background: #0b0d14; color: #e8eaf2; min-height: 100vh; padding: 32px 16px; }
        .wrap { max-width: 640px; margin: 0 auto; }
        .topnav { display: flex; gap: 16px; margin-bottom: 20px; font-size: 0.85rem; }
        .topnav a { color: #7b849a; text-decoration: none; padding: 6px 12px; border-radius: 8px; transition: .15s; }
        .topnav a:hover, .topnav a.active { color: #e8eaf2; background: rgba(124,92,255,0.12); }
        .topnav a.active { color: #7c5cff; }
        h1 { font-size: 1.35rem; margin-bottom: 6px; background: linear-gradient(135deg, #7c5cff, #4fd1c5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hint { color: #7b849a; font-size: 0.82rem; margin-bottom: 24px; }
        ul { list-style: none; background: #161b28; border: 1px solid #252b3d; border-radius: 14px; overflow: hidden; }
        .row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid #252b3d; }
        .row:last-child { border-bottom: none; }
        .rank { width: 28px; text-align: center; font-weight: 700; color: #a78bfa; flex-shrink: 0; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #7c5cff; flex-shrink: 0; }
        .meta { min-width: 0; }
        .name { font-weight: 600; color: #e8eaf2; text-decoration: none; display: block; margin-bottom: 2px; }
        .name:hover { color: #4fd1c5; }
        .sub { font-size: 0.78rem; color: #7b849a; }
        .sub strong { color: #4fd1c5; }
        .empty { padding: 28px; text-align: center; color: #7b849a; }
        code { background: #111420; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="wrap">
        <nav class="topnav">
            <a href="/status">Estado</a>
            <a href="/leaderboard" class="active">Leaderboard</a>
        </nav>
        <h1>🏆 Leaderboard</h1>
        <p class="hint">${BOT_NAME} · Top por Custom Coins · Clic en un nombre abre su perfil de Discord</p>
        <ul>${rows}</ul>
    </div>
</body>
</html>`;
}

// ── HTML: Status Page ────────────────────────────────────────
function buildStatusHtml(client, port, redisEnabled, redisOk) {
    const botOnline = client.user !== null;
    const uptimeStr = fmtUptime(client.uptime);
    const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const baseUrl = resolvePublicBaseUrl(port);

    const services = [
        {
            name: "Bot de Discord",
            icon: "🤖",
            status: botOnline ? "online" : "offline",
            details: botOnline ? `Conectado como ${client.user.tag}` : "Desconectado",
            extra: `Ping: ${Math.round(client.ws?.ping ?? 0)}ms · Servidores: ${client.guilds.cache.size} · Usuarios: ${client.users.cache.size}`
        },
        {
            name: "Base de Datos",
            icon: "📦",
            status: !redisEnabled ? "disabled" : (redisOk ? "online" : "offline"),
            details: !redisEnabled ? "No habilitado" : (redisOk ? "Conectada y respondiendo" : "No disponible"),
            extra: redisEnabled ? "Redis activo" : "Usando almacenamiento local"
        },
        {
            name: "Leaderboard",
            icon: "🏆",
            status: isLeaderboardEnabled() ? "online" : "disabled",
            details: isLeaderboardEnabled() ? "Página pública activa" : "Deshabilitado",
            extra: `${baseUrl}/leaderboard`
        }
    ];

    const statusColors = { online: "#34d399", offline: "#f87171", disabled: "#7b849a" };
    const statusLabels = { online: "Operativo", offline: "Caído", disabled: "Deshabilitado" };

    const servicesHtml = services.map(s => `
        <div class="svc">
            <div class="svc-icon">${s.icon}</div>
            <div class="svc-body">
                <div class="svc-header">
                    <span class="svc-name">${s.name}</span>
                    <span class="svc-badge" style="background:${statusColors[s.status]}22;color:${statusColors[s.status]}">${statusLabels[s.status]}</span>
                </div>
                <div class="svc-detail">${s.details}</div>
                <div class="svc-extra">${s.extra}</div>
            </div>
        </div>`).join("");

    const allHealthy = services.every(s => s.status !== "offline");
    const overallColor = allHealthy ? "#34d399" : "#f87171";
    const overallLabel = allHealthy ? "Todos los servicios operativos" : "Algunos servicios caídos";

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado — ${BOT_NAME}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #0b0d14; color: #e8eaf2; min-height: 100vh; padding: 32px 16px; }
        .wrap { max-width: 640px; margin: 0 auto; }
        .topnav { display: flex; gap: 16px; margin-bottom: 20px; font-size: 0.85rem; }
        .topnav a { color: #7b849a; text-decoration: none; padding: 6px 12px; border-radius: 8px; transition: .15s; }
        .topnav a:hover, .topnav a.active { color: #e8eaf2; background: rgba(124,92,255,0.12); }
        .topnav a.active { color: #7c5cff; }
        h1 { font-size: 1.35rem; margin-bottom: 20px; background: linear-gradient(135deg, #7c5cff, #4fd1c5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .overall { display:flex;align-items:center;gap:12px;padding:20px 24px;border-radius:12px;margin-bottom:24px;border:1px solid ${overallColor}33;background:${overallColor}0a }
        .dot { width:14px;height:14px;border-radius:50%;background:${overallColor};box-shadow:0 0 12px ${overallColor};flex-shrink:0 }
        .overall-label { font-size:1.1rem;font-weight:700;color:${overallColor} }
        .overall-sub { font-size:0.82rem;color:#7b849a;margin-top:2px }
        .svc { display:flex;gap:16px;padding:20px;background:#161b28;border:1px solid #252b3d;border-radius:12px;margin-bottom:12px }
        .svc-icon { font-size:1.8rem;flex-shrink:0;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#0b0d14;border-radius:10px }
        .svc-body { flex:1;min-width:0 }
        .svc-header { display:flex;align-items:center;gap:10px;margin-bottom:6px }
        .svc-name { font-weight:700;font-size:0.95rem }
        .svc-badge { padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;text-transform:uppercase }
        .svc-detail { font-size:0.85rem;color:#e8eaf2;margin-bottom:4px }
        .svc-extra { font-size:0.78rem;color:#7b849a;font-family:'JetBrains Mono',monospace }
        .info-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:24px }
        .info-card { background:#161b28;border:1px solid #252b3d;border-radius:10px;padding:16px }
        .info-card .label { font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#7b849a;margin-bottom:6px }
        .info-card .value { font-size:1rem;font-weight:700 }
    </style>
</head>
<body>
    <div class="wrap">
        <nav class="topnav">
            <a href="/status" class="active">Estado</a>
            <a href="/leaderboard">Leaderboard</a>
        </nav>
        <h1>Estado del Sistema</h1>
        <div class="overall">
            <div class="dot"></div>
            <div>
                <div class="overall-label">${overallLabel}</div>
                <div class="overall-sub">Última verificación: ${new Date().toLocaleString("es-ES")}</div>
            </div>
        </div>
        ${servicesHtml}
        <div class="info-grid">
            <div class="info-card"><div class="label">Uptime</div><div class="value">${uptimeStr}</div></div>
            <div class="info-card"><div class="label">Memoria</div><div class="value">${memMb} MB</div></div>
            <div class="info-card"><div class="label">Node.js</div><div class="value">${process.version}</div></div>
            <div class="info-card"><div class="label">Plataforma</div><div class="value">${process.platform} ${process.arch}</div></div>
        </div>
    </div>
</body>
</html>`;
}

// ── Main: start the web server ───────────────────────────────
export function startWebServer(client) {
    const port = parseInt(process.env.PORT || "3000", 10);
    const app = express();

    const redisEnabled = (process.env.REDIS_DB || "").toLowerCase() === "true";

    // ── Servir archivos JSON de tickets ───────────────────
    const TICKETS_DIR = path.resolve(__dirname, "../secrets/tickets");

    // ── Routes ──────────────────────────────────────────────
    app.get("/", (_req, res) => {
        res.redirect("/leaderboard");
    });

    app.get("/leaderboard", async (_req, res) => {
        try {
            const entries = await loadLeaderboardEntries(client, 25);
            const baseUrl = resolvePublicBaseUrl(port);
            res.type("html").send(buildLeaderboardHtml(entries, baseUrl));
        } catch (err) {
            res.status(500).send("Error al cargar leaderboard");
        }
    });

    app.get("/status", async (_req, res) => {
        const redisOk = redisEnabled ? await checkRedisHealth() : null;
        res.type("html").send(buildStatusHtml(client, port, redisEnabled, redisOk));
    });

    // ── Ruta de tickets: /bot/tickets/ticket-XXXX.json ──────
    app.get("/bot/tickets/:ticketFile", (req, res) => {
        const ticketFile = req.params.ticketFile;
        // Solo permitir archivos .json con formato ticket-XXXX
        if (!/^\d{4}\.json$/.test(ticketFile) && !/^ticket-\d{4}\.json$/.test(ticketFile)) {
            return res.status(400).json({ error: "Formato de ticket inválido" });
        }
        const id = ticketFile.replace('ticket-', '').replace('.json', '');
        const filePath = path.join(TICKETS_DIR, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Ticket no encontrado" });
        }
        try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            // Agregar info de hosting
            data._hostingInfo = {
                servedAt: new Date().toISOString(),
                botOnline: client.user !== null,
                botUptime: client.uptime ?? 0,
                note: "Este archivo estará disponible mientras el bot esté en línea."
            };
            res.type("json").send(JSON.stringify(data, null, 2));
        } catch {
            res.status(500).json({ error: "Error al leer ticket" });
        }
    });

    app.get("/api/health", async (_req, res) => {
        const redisOk = redisEnabled ? await checkRedisHealth() : true;
        const botOnline = client.user !== null;
        const status = botOnline && redisOk ? 200 : 503;
        res.status(status).json({
            status: botOnline && redisOk ? "healthy" : "degraded",
            bot: { online: botOnline, tag: client.user?.tag || null },
            redis: { enabled: redisEnabled, connected: redisOk },
            uptime: client.uptime ?? 0,
            timestamp: Date.now()
        });
    });

    // ── Start ───────────────────────────────────────────────
    const server = app.listen(port, "0.0.0.0", () => {
        const base = resolvePublicBaseUrl(port);
        console.log(`[+] Web server escuchando en: ${base}`);
        console.log(`[+] Leaderboard: ${base}/leaderboard`);
        console.log(`[+] Estado: ${base}/status`);
        console.log(`[+] Tickets: ${base}/bot/tickets/`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.warn(`[!] Puerto ${port} en_uso, probando ${port + 1}...`);
            server.close();
            app.listen(port + 1, "0.0.0.0");
        } else {
            console.error("[!] Error al iniciar web server:", err.message);
        }
    });

    return server;
}
