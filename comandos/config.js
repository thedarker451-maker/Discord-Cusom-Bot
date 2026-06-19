import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import db from "../scr/database.js";
import Emojis from "../scr/emojis.js";

export const configCommands = [
    {
        name: "setup",
        description: "Configura el bot para este servidor (Roles, Canales, etc.)",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand(sub => sub
                    .setName("canales")
                    .setDescription("Configura canales de registro y bienvenida.")
                    .addChannelOption(opt => opt.setName("logs").setDescription("Canal para registros de moderación").setRequired(false))
                    .addChannelOption(opt => opt.setName("bienvenida").setDescription("Canal de bienvenida").setRequired(false))
                )
                .addSubcommand(sub => sub
                    .setName("roles")
                    .setDescription("Configura roles de administración y moderación.")
                    .addRoleOption(opt => opt.setName("moderador").setDescription("Rol para moderadores").setRequired(false))
                    .addRoleOption(opt => opt.setName("administrador").setDescription("Rol para administradores").setRequired(false))
                )
                .addSubcommand(sub => sub
                    .setName("ver")
                    .setDescription("Ver la configuración actual del servidor.")
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            const settings = await db.getSettings(guildId);

            if (subcommand === "canales") {
                const logs = interaction.options.getChannel("logs");
                const welcome = interaction.options.getChannel("bienvenida");

                if (logs) settings.logChannel = logs.id;
                if (welcome) settings.welcomeChannel = welcome.id;

                await db.setSettings(guildId, settings);

                const embed = new EmbedBuilder()
                    .setTitle(`${Emojis.checkVerify} Canales Configurados`)
                    .setDescription(`Se han actualizado los canales del servidor con éxito.`)
                    .addFields(
                        { name: "Registro (Logs)", value: settings.logChannel ? `<#${settings.logChannel}>` : "No configurado", inline: true },
                        { name: "Bienvenidas", value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : "No configurado", inline: true }
                    )
                    .setColor("#22C55E");

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === "roles") {
                const mod = interaction.options.getRole("moderador");
                const admin = interaction.options.getRole("administrador");

                if (mod) {
                    if (!settings.modRoles.includes(mod.id)) {
                        settings.modRoles.push(mod.id);
                    }
                }
                if (admin) {
                    if (!settings.adminRoles.includes(admin.id)) {
                        settings.adminRoles.push(admin.id);
                    }
                }

                await db.setSettings(guildId, settings);

                const embed = new EmbedBuilder()
                    .setTitle(`${Emojis.checkVerify} Roles Configurados`)
                    .setDescription(`Se han actualizado los roles del servidor.`)
                    .addFields(
                        { name: "Roles de Moderación", value: settings.modRoles.map(id => `<@&${id}>`).join(", ") || "Ninguno", inline: true },
                        { name: "Roles de Administración", value: settings.adminRoles.map(id => `<@&${id}>`).join(", ") || "Ninguno", inline: true }
                    )
                    .setColor("#22C55E");

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === "ver") {
                const embed = new EmbedBuilder()
                    .setTitle(`${Emojis.serverguide} Configuración del Servidor`)
                    .addFields(
                        { name: "Prefijo", value: `\`${settings.prefix || "!"}\``, inline: true },
                        { name: "Canal Logs", value: settings.logChannel ? `<#${settings.logChannel}>` : "*No configurado*", inline: true },
                        { name: "Canal Bienvenida", value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : "*No configurado*", inline: true },
                        { name: "Roles Mod", value: settings.modRoles.map(id => `<@&${id}>`).join(", ") || "*Ninguno*", inline: false },
                        { name: "Roles Admin", value: settings.adminRoles.map(id => `<@&${id}>`).join(", ") || "*Ninguno*", inline: false }
                    )
                    .setColor("#7F00FF")
                    .setThumbnail(interaction.guild.iconURL());

                await interaction.reply({ embeds: [embed] });
            }
        },
        async executePrefix(message, args) {
            const settings = await db.getSettings(message.guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.serverguide} Configuración del Servidor`)
                .setDescription("Usa comandos slash `/setup` para modificar la configuración.")
                .addFields(
                    { name: "Prefijo", value: `\`${settings.prefix || "!"}\``, inline: true },
                    { name: "Canal Logs", value: settings.logChannel ? `<#${settings.logChannel}>` : "*No configurado*", inline: true },
                    { name: "Canal Bienvenida", value: settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : "*No configurado*", inline: true }
                )
                .setColor("#7F00FF");

            await message.reply({ embeds: [embed] });
        }
    }
];
