import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { loadAllCommands, allCommands } from "../scr/command-loader.js";

export const reloadCommand = [
    {
        name: "reload",
        description: "Recarga todos los comandos del bot (solo owner)",
        category: "admin",

        slashBuilder() {
            return new SlashCommandBuilder()
                .setName("reload")
                .setDescription("Recarga todos los comandos del bot (solo owner)")
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },

        async executeSlash(interaction) {
            const ownerId = process.env.OWNER_ID;
            const userId = interaction.user.id;

            const isOwner = ownerId && (
                ownerId.split(",").map(id => id.trim().split("'")[0]).includes(userId) ||
                ownerId.includes(userId)
            );

            if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("❌ Acceso Denegado")
                            .setDescription("Solo el owner o un administrador puede usar este comando.")
                            .setColor("#FF0000")
                    ],
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            try {
                const oldCount = allCommands.length;
                allCommands.length = 0;
                await loadAllCommands();
                const newCount = allCommands.length;

                const slashData = [];
                for (const cmd of allCommands) {
                    if (cmd.slashBuilder) {
                        try {
                            slashData.push(cmd.slashBuilder().toJSON());
                        } catch {}
                    }
                }

                const { REST, Routes } = await import("discord.js");
                const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
                const rest = new REST({ version: "10" }).setToken(token);

                await rest.put(
                    Routes.applicationCommands(interaction.client.user.id),
                    { body: slashData }
                );

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("✅ Comandos Recargados")
                            .setDescription(
                                `**Comandos anteriores:** ${oldCount}\n` +
                                `**Comandos actuales:** ${newCount}\n` +
                                `**Slash commands registrados:** ${slashData.length}`
                            )
                            .setColor("#00FF00")
                            .setTimestamp()
                    ]
                });

                console.log(`[+] Comandos recargados por ${interaction.user.tag}: ${oldCount} → ${newCount}`);

            } catch (err) {
                console.error("[Reload Error]", err);
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("❌ Error al Recargar")
                            .setDescription(`Error:\n\`\`\`${err.message}\`\`\``)
                            .setColor("#FF0000")
                    ]
                });
            }
        }
    }
];
