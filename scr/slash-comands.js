import { REST, Routes } from "discord.js";
import { allCommands } from "./command-loader.js";

export async function registerSlashCommands(client, commands) {
    const slashData = [];
    
    for (const cmd of commands) {
        if (cmd.slashBuilder) {
            try {
                const builder = cmd.slashBuilder();
                slashData.push(builder.toJSON());
            } catch (err) {
                console.error(`Error al construir JSON para el comando slash "${cmd.name}":`, err);
            }
        }
    }

    const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
    const rest = new REST({ version: "10" }).setToken(token);

    try {
        const globalRegister = process.env.DISCORD_COMMANDS_ON_ALL_SEVERS !== "false";
        
        if (globalRegister) {
            console.log("[*] Registrando comandos slash globales...");
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: slashData }
            );
            console.log("[+] Comandos slash globales registrados correctamente.");
        } else {
            const guildId = process.env.DISCORD_GUILD_ID;
            if (guildId && guildId.trim() !== "" && !guildId.startsWith("#")) {
                console.log(`[*] Registrando comandos slash locales en servidor: ${guildId}...`);
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guildId),
                    { body: slashData }
                );
                console.log("[+] Comandos slash locales registrados correctamente.");
            } else {
                console.warn("[!] ADVERTENCIA: DISCORD_COMMANDS_ON_ALL_SEVERS es 'false' pero no se ha configurado un DISCORD_GUILD_ID válido. Registrando globalmente como alternativa.");
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: slashData }
                );
                console.log("[+] Comandos slash globales registrados correctamente (fallback).");
            }
        }
    } catch (error) {
        console.error("[!] Error al registrar comandos slash:", error);
    }
}

export async function handleSlashCommand(interaction) {
    const command = allCommands.find(cmd => cmd.name === interaction.commandName);
    if (!command) return;

    if (typeof command.executeSlash === "function") {
        try {
            await command.executeSlash(interaction);
        } catch (error) {
            console.error(`[!] Error al ejecutar el comando slash "${interaction.commandName}":`, error);
            
            const errorMessage = { content: "❌ Ocurrió un error interno al intentar ejecutar este comando.", ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}
