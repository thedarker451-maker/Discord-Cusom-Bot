import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import { runTelemetry } from "./telemetry.js";
import { handlePrefixCommand } from "./prefix.js";
import { registerSlashCommands, handleSlashCommand } from "./slash-comands.js";
import { setupWelcomeEvents } from "../eventos/help_welcome_mensaje.js";
import { loadAndDecryptEnv } from "./security-helper.js";
import { initWebhookLogger } from "./webhook-logger.js";
import { loadAllCommands, allCommands } from "./command-loader.js";
import { writeBotStatus, clearBotStatus } from "./bot-status.js";
import { startWebServer, isLeaderboardEnabled } from "./leaderboard.js";
import { checkForUpdates, getCurrentVersion } from "./auto-update.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║   Custom Discord Bot v${getCurrentVersion()}                   ║`);
console.log(`╚══════════════════════════════════════════════╝\n`);

// Auto-update (solo en VPS/servidor propio, no en Render)
checkForUpdates();

loadAndDecryptEnv();
initWebhookLogger();

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;

if (!token || token.trim() === "") {
    console.error("[!] ERROR: DISCORD_TOKEN no está configurado en secrets/.env");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once("clientReady", async () => {
    console.log(`[+] Bot conectado como: ${client.user.tag}`);
    console.log(`[+] Servidores: ${client.guilds.cache.size} · Usuarios: ${client.users.cache.size}`);
    runTelemetry(client);
    writeBotStatus(client);
    setInterval(() => writeBotStatus(client), 5000);

    await registerSlashCommands(client, allCommands);

    if (isLeaderboardEnabled()) {
        startWebServer(client);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    await handlePrefixCommand(message);
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    }
});

setupWelcomeEvents(client);

// Snipe listener
import { setupSnipeListener } from "../comandos/utils2.js";
setupSnipeListener(client);

async function start() {
    await loadAllCommands();
    await client.login(token).catch(err => {
        console.error("[!] Error al iniciar sesión en Discord:", err);
        clearBotStatus();
    });
}

process.on("SIGINT", () => { clearBotStatus(); process.exit(0); });
process.on("SIGTERM", () => { clearBotStatus(); process.exit(0); });

start();
