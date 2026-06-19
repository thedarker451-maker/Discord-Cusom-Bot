/**
 * Envía logs y errores del bot a webhooks de Discord (LOG_WEBHOOK / ERROR_WEBHOOK).
 */

const MAX_LEN = 1900;
const LOG_COOLDOWN_MS = 1200;

let logWebhook = "";
let errorWebhook = "";
let lastLogSend = 0;
let logBuffer = [];
let logFlushTimer = null;

function trim(text) {
    const s = String(text ?? "").trim();
    return s.length <= MAX_LEN ? s : `${s.slice(0, MAX_LEN - 3)}...`;
}

async function postWebhook(url, body) {
    if (!url || !url.startsWith("http")) return;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            process.stderr.write(`[!] Webhook respondió ${res.status}\n`);
        }
    } catch (err) {
        process.stderr.write(`[!] Error al enviar webhook: ${err.message}\n`);
    }
}

function flushLogBuffer() {
    if (!logBuffer.length || !logWebhook) return;
    const now = Date.now();
    if (now - lastLogSend < LOG_COOLDOWN_MS) {
        logFlushTimer = setTimeout(flushLogBuffer, LOG_COOLDOWN_MS);
        return;
    }
    const chunk = logBuffer.splice(0, 8).join("\n");
    lastLogSend = now;
    postWebhook(logWebhook, { content: trim(`\`\`\`\n${chunk}\n\`\`\``) });
    if (logBuffer.length) {
        logFlushTimer = setTimeout(flushLogBuffer, LOG_COOLDOWN_MS);
    }
}

function queueLogLine(line) {
    if (!logWebhook) return;
    logBuffer.push(line);
    if (!logFlushTimer) {
        logFlushTimer = setTimeout(() => {
            logFlushTimer = null;
            flushLogBuffer();
        }, 400);
    }
}

function sendError(payload) {
    if (!errorWebhook) return;
    postWebhook(errorWebhook, {
        embeds: [{
            title: "Error del bot",
            description: trim(payload),
            color: 0xf87171,
            timestamp: new Date().toISOString()
        }]
    });
}

function formatArgs(args) {
    return args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === "object") {
            try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
    }).join(" ");
}

export function initWebhookLogger() {
    logWebhook = (process.env.LOG_WEBHOOK || "").trim();
    errorWebhook = (process.env.ERROR_WEBHOOK || "").trim();

    if (!logWebhook && !errorWebhook) return;

    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.log = (...args) => {
        origLog(...args);
        queueLogLine(formatArgs(args));
    };

    console.warn = (...args) => {
        origWarn(...args);
        queueLogLine(`⚠ ${formatArgs(args)}`);
    };

    console.error = (...args) => {
        origError(...args);
        sendError(formatArgs(args));
    };

    process.on("uncaughtException", (err) => {
        sendError(err.stack || err.message);
    });

    process.on("unhandledRejection", (reason) => {
        sendError(reason instanceof Error ? (reason.stack || reason.message) : String(reason));
    });

    if (logWebhook) origLog("[+] Logger de consola conectado a LOG_WEBHOOK");
    if (errorWebhook) origLog("[+] Logger de errores conectado a ERROR_WEBHOOK");
}
