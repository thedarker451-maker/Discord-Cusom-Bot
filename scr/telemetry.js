import os from "os";
import { writeBotStatus } from "./bot-status.js";

export function runTelemetry(client) {
    writeBotStatus(client, { event: "startup" });

    if (process.env.TELEMETRY_STATE !== "true") {
        return;
    }
    console.log("==========================================");
    console.log("  CUSTOM DISCORD BOT — TELEMETRÍA INICIO  ");
    console.log("==========================================");
    console.log(`Bot: ${client.user.tag}`);
    console.log(`ID del Bot: ${client.user.id}`);
    console.log(`Sistema Operativo: ${os.type()} (${os.release()})`);
    console.log(`Arquitectura: ${os.arch()}`);
    console.log(`Versión de Node.js: ${process.version}`);
    console.log(`Servidores en los que está: ${client.guilds.cache.size}`);
    console.log(`Miembros en caché: ${client.users.cache.size}`);
    console.log("==========================================");
}
