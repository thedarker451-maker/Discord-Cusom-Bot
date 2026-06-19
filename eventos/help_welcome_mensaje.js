export const helpWelcomeEmbed = {
    "embeds": [
        {
            "title": "👋 | ¡Hola! — Custom Discord Bot",
            "description": "Soy **Custom Discord Bot**, tu asistente modular para Discord. Aquí tienes un resumen rápido:\n\n" +
                "**🔍 UTILIDADES:**\n" +
                "• `/help` | `!help` — Panel de ayuda con todas las categorías.\n" +
                "• `/ping` | `!ping` — Latencia del bot.\n" +
                "• `/userinfo` | `/serverinfo` | `/avatar`\n\n" +
                "**🎮 DIVERSIÓN:**\n" +
                "• `/slap` | `/amor` | `/8ball` | `/aquinator` | `/chiste` | `/aja` | `/hug` | `/dado`\n\n" +
                "**💎 ECONOMÍA:**\n" +
                "• `/balance` | `/daily` | `/top` | `/tienda`\n\n" +
                "**🛡️ MODERACIÓN:**\n" +
                "• `/kick` | `/ban` | `/warn` | `/clear`\n\n" +
                "Usa `/help` para ver la lista completa. ||@everyone||"
        }
    ],
    "components": [
        {
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "style": 5,
                    "label": "Github Repo",
                    "emoji": {
                        "id": "1513285174950105278",
                        "name": "github_logop"
                    },
                    "url": "https://github.com/thedarker451-maker/Discord-Custom-Bot"
                },
                {
                    "type": 2,
                    "style": 5,
                    "label": "Check Ur Discord Server",
                    "emoji": {
                        "id": "1513286948649697424",
                        "name": "discord_emoji"
                    },
                    "url": "https://discord.gg/xAsDHMwjw7"
                }
            ]
        }
    ]
};

import db from "../scr/database.js";

export function setupWelcomeEvents(client) {
    client.on("guildMemberAdd", async (member) => {
        if (process.env.WELCOME_MESSAGE_HELP === "false") {
            return;
        }

        try {
            const settings = await db.getSettings(member.guild.id);
            let channel = null;

            if (settings.welcomeChannel) {
                channel = member.guild.channels.cache.get(settings.welcomeChannel);
            }

            if (!channel) {
                channel = member.guild.systemChannel || 
                    member.guild.channels.cache.find(ch => 
                        ch.type === 0 &&
                        ch.permissionsFor(member.guild.members.me).has("SendMessages")
                    );
            }

            if (channel) {
                await channel.send({
                    content: `👋 ¡Hola ${member}, bienvenido/a a **${member.guild.name}**!`,
                    embeds: helpWelcomeEmbed.embeds,
                    components: helpWelcomeEmbed.components
                });
            }
        } catch (error) {
            console.error(`[!] Error al enviar mensaje de bienvenida en servidor "${member.guild.name}":`, error);
        }
    });
}
