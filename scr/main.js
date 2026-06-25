import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import { runTelemetry } from "./telemetry.js";
import { handlePrefixCommand } from "./prefix.js";
import { registerSlashCommands, handleSlashCommand } from "./slash-comands.js";
import { setupWelcomeEvents } from "../eventos/help_welcome_mensaje.js";
import { setupLogEvents } from "../eventos/log_events.js";
import { loadAndDecryptEnv } from "./security-helper.js";
import { initWebhookLogger } from "./webhook-logger.js";
import { loadAllCommands, allCommands } from "./command-loader.js";
import { writeBotStatus, clearBotStatus } from "./bot-status.js";
import { startWebServer, isLeaderboardEnabled } from "./leaderboard.js";
import { checkForUpdates, getCurrentVersion } from "./auto-update.js";
import { startTempbanWorker } from "./tempban-worker.js";
import { ticketsCommand } from "../comandos/tickets.js";

const ticketsHandler = ticketsCommand[0];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// DISCORD ACTIVITY / PRESENCE
// ═══════════════════════════════════════════════════════════════
const ACTIVITY_TYPES = {
    playing:    ActivityType.Playing,
    listening:  ActivityType.Listening,
    watching:   ActivityType.Watching,
    streaming:  ActivityType.Streaming,
    competing:  ActivityType.Competing,
    custom:     ActivityType.Custom,
};

function setBotPresence(client) {
    try {
        const typeStr = (process.env.BOT_ACTIVITY_TYPE || "playing").toLowerCase().trim();
        const text = process.env.BOT_ACTIVITY_TEXT || process.env.BOT_ACTIVITY_STATE || "Discord Custom Bot";
        const url = process.env.BOT_ACTIVITY_URL || "";
        const state = process.env.BOT_ACTIVITY_STATE || text;

        const activityType = ACTIVITY_TYPES[typeStr] || ActivityType.Playing;

        const activityOptions = { name: text };
        if (activityType === ActivityType.Streaming && url) {
            activityOptions.url = url;
        }
        if (activityType === ActivityType.Custom) {
            activityOptions.state = state;
        }

        // Rich Presence images (requiere Discord Application con assets subidos)
        const largeImage = (process.env.BOT_ACTIVITY_LARGE_IMAGE || "").trim();
        const largeImageText = (process.env.BOT_ACTIVITY_LARGE_IMAGE_TEXT || "").trim();
        const smallImage = (process.env.BOT_ACTIVITY_SMALL_IMAGE || "").trim();
        const smallImageText = (process.env.BOT_ACTIVITY_SMALL_IMAGE_TEXT || "").trim();

        if (largeImage || smallImage) {
            activityOptions.assets = {};
            if (largeImage) {
                activityOptions.assets.largeImage = largeImage;
                if (largeImageText) activityOptions.assets.largeImageText = largeImageText;
            }
            if (smallImage) {
                activityOptions.assets.smallImage = smallImage;
                if (smallImageText) activityOptions.assets.smallImageText = smallImageText;
            }
        }

        client.user.setPresence({
            activities: [activityOptions],
            status: "online"
        });

        console.log(`[+] Activity: ${typeStr} ${text}`);
    } catch (err) {
        console.error("[!] Error al configurar activity:", err.message);
    }
}

// Logo bonito en terminal usando oh-my-logo con opciones avanzadas
const showLogo = async () => {
    const version = getCurrentVersion();
    
    try {
        const { exec } = await import('child_process');
        
        const cmd = `npx oh-my-logo "Discord Custom\\nBot" sunset --filled --block-font chrome --letter-spacing 1`;
        
        exec(cmd, { timeout: 10000 }, (error, stdout) => {
            if (!error && stdout.trim()) {
                console.log('\n' + stdout);
                console.log('\x1b[0;37m' + ' '.repeat(21) + `(v${version})\x1b[0m`);
                console.log('');
                console.log('\x1b[36m  🤖 Sistema de moderación avanzado\x1b[0m');
                console.log('\x1b[33m  💰 Economía persistente con niveles\x1b[0m');
                console.log('\x1b[35m  🎫 Sistema de tickets integrado\x1b[0m');
                console.log('\x1b[32m  🧠 Soporte IA multi-proveedor\x1b[0m');
                console.log('');
            } else {
                console.log('');
                console.log('\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
                console.log('\x1b[35m║\x1b[0m                                                          \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m        \x1b[1;37mDISCORD CUSTOM\x1b[0m                                \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m                    \x1b[1;37mBOT\x1b[0m                                  \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m                  \x1b[0;37m(v' + version + ')\x1b[0m                                  \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m                                                          \x1b[35m║\x1b[0m');
                console.log('\x1b[35m╠══════════════════════════════════════════════════════════╣\x1b[0m');
                console.log('\x1b[35m║\x1b[0m  \x1b[36m🤖 Sistema de moderación avanzado\x1b[0m                        \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m  \x1b[33m💰 Economía persistente con niveles\x1b[0m                       \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m  \x1b[35m🎫 Sistema de tickets integrado\x1b[0m                           \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m  \x1b[32m🧠 Soporte IA multi-proveedor\x1b[0m                             \x1b[35m║\x1b[0m');
                console.log('\x1b[35m║\x1b[0m                                                          \x1b[35m║\x1b[0m');
                console.log('\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m');
                console.log('');
            }
        });
    } catch {
        console.log('\n\x1b[1;35m🤖 DISCORD CUSTOM BOT v' + version + '\x1b[0m\n');
    }
};

showLogo();

// Auto-update (solo en VPS/servidor propio, no en Render)
checkForUpdates();

loadAndDecryptEnv();
initWebhookLogger();

const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;

if (!token || token.trim() === "") {
    console.log('');
    console.log('\x1b[31m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[31m║\x1b[0m  \x1b[1;31m✗ ERROR: DISCORD_TOKEN no configurado\x1b[0m                   \x1b[31m║\x1b[0m');
    console.log('\x1b[31m║\x1b[0m                                                          \x1b[31m║\x1b[0m');
    console.log('\x1b[31m║\x1b[0m  \x1b[33m→ Edita secrets/.env y agrega tu token\x1b[0m                   \x1b[31m║\x1b[0m');
    console.log('\x1b[31m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
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
    console.log('\x1b[32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║\x1b[0m  \x1b[1;32m✓ BOT CONECTADO\x1b[0m                                       \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m                                                          \x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m  \x1b[36mTag:\x1b[0m      ' + client.user.tag.padEnd(43) + '\x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m  \x1b[36mServidores:\x1b[0m ' + String(client.guilds.cache.size).padEnd(42) + '\x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m  \x1b[36mUsuarios:\x1b[0m  ' + String(client.users.cache.size).padEnd(43) + '\x1b[32m║\x1b[0m');
    console.log('\x1b[32m║\x1b[0m                                                          \x1b[32m║\x1b[0m');
    console.log('\x1b[32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    runTelemetry(client);
    writeBotStatus(client);
    setInterval(() => writeBotStatus(client), 5000);

    setBotPresence(client);

    await registerSlashCommands(client, allCommands);
    startTempbanWorker(client);

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
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "ticket_create" || interaction.customId === "ticket_actions") {
            await ticketsHandler.handleSelect(interaction);
        }
    }
    // Modal submit handler para cierre de tickets
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("ticket_close_modal_")) {
            await ticketsHandler.handleModalSubmit(interaction);
        }
    }
});

setupWelcomeEvents(client);
setupLogEvents(client);

// Snipe listener
import { setupSnipeListener } from "../comandos/utils2.js";
setupSnipeListener(client);

export async function startBot(customToken = null) {
    const finalToken = customToken || token;
    if (!finalToken || finalToken.trim() === "") {
        console.error("[!] ERROR: Token no configurado.");
        return;
    }
    await loadAllCommands();
    await client.login(finalToken).catch(err => {
        console.error("[!] Error al iniciar sesión en Discord:", err);
        clearBotStatus();
    });
    return client;
}

process.on("SIGINT", () => { clearBotStatus(); process.exit(0); });
process.on("SIGTERM", () => { clearBotStatus(); process.exit(0); });

export { client };

// Solo ejecutar automáticamente si es el script principal
if (process.argv[1] === __filename) {
    startBot();
}
