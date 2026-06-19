import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATUS_PATH = path.resolve(__dirname, "../secrets/bot-status.json");

function isDocker() {
    try {
        if (fs.existsSync("/.dockerenv")) return true;
        const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
        if (cgroup.includes("docker") || cgroup.includes("kubepods")) return true;
    } catch {}
    return false;
}

export function writeBotStatus(client, extra = {}) {
    try {
        const dir = path.dirname(STATUS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const docker = isDocker();
        const payload = {
            online: true,
            tag: client.user?.tag || "Conectando...",
            id: client.user?.id || null,
            guilds: client.guilds?.cache?.size ?? 0,
            users: client.users?.cache?.size ?? 0,
            ping: Math.round(client.ws?.ping ?? 0),
            uptime: client.uptime ?? 0,
            os: `${os.type()} ${os.release()}`,
            arch: os.arch(),
            node: process.version,
            memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            docker,
            container: docker ? (process.env.HOSTNAME || "discord-bot") : null,
            redis: (process.env.REDIS_DB || "").toLowerCase() === "true",
            env: process.env.NODE_ENV || "development",
            updatedAt: Date.now(),
            ...extra
        };

        fs.writeFileSync(STATUS_PATH, JSON.stringify(payload, null, 2), "utf8");
    } catch {
        // No interrumpir el bot si falla la escritura de estado
    }
}

export function clearBotStatus() {
    try {
        if (fs.existsSync(STATUS_PATH)) {
            fs.writeFileSync(STATUS_PATH, JSON.stringify({ online: false, updatedAt: Date.now() }, null, 2));
        }
    } catch {
        // ignorar
    }
}
