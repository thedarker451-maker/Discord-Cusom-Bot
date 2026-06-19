import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import db from "../scr/database.js";
import Emojis from "../scr/emojis.js";

// Convierte bits de permisos a String para serialización
function serializePermissions(perms) {
    return perms.toArray();
}

export const recoveryCommands = [
    {
        name: "recovery-backup",
        description: "Gestión de Backups del Servidor (Crear o Ver).",
        category: "recovery",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand(sub => sub
                    .setName("crear")
                    .setDescription("Crea un backup completo del estado actual del servidor.")
                )
                .addSubcommand(sub => sub
                    .setName("ver")
                    .setDescription("Lista los backups disponibles del servidor.")
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            const subcommand = interaction.options.getSubcommand();
            const guild = interaction.guild;

            if (subcommand === "crear") {
                await interaction.deferReply();
                
                try {
                    // 1. Obtener Roles
                    const rolesRaw = await guild.roles.fetch();
                    const roles = rolesRaw.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({
                        name: r.name,
                        color: r.color,
                        hoist: r.hoist,
                        permissions: r.permissions.bitfield.toString(), // Guardar como string de bits
                        mentionable: r.mentionable,
                        position: r.position
                    }));

                    // 2. Obtener Canales
                    const channelsRaw = await guild.channels.fetch();
                    const channels = channelsRaw.map(c => {
                        const overwrites = c.permissionOverwrites.cache.map(o => ({
                            id: o.id,
                            type: o.type, // 0 = role, 1 = member
                            allow: o.allow.bitfield.toString(),
                            deny: o.deny.bitfield.toString()
                        }));

                        return {
                            id: c.id,
                            name: c.name,
                            type: c.type,
                            position: c.position,
                            parentId: c.parentId,
                            topic: c.topic || null,
                            nsfw: c.nsfw || false,
                            rateLimitPerUser: c.rateLimitPerUser || 0,
                            permissionOverwrites: overwrites
                        };
                    });

                    // Guardar backup
                    const backupId = await db.saveBackup(guild.id, {
                        guildName: guild.name,
                        rolesCount: roles.length,
                        channelsCount: channels.length,
                        roles,
                        channels
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.checkVerify} Backup Creado con Éxito`)
                        .setDescription(`Se ha tomado un snapshot completo de la estructura del servidor.`)
                        .addFields(
                            { name: "ID del Backup", value: `\`${backupId}\``, inline: true },
                            { name: "Roles guardados", value: `${roles.length}`, inline: true },
                            { name: "Canales guardados", value: `${channels.length}`, inline: true }
                        )
                        .setColor("#22C55E")
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (err) {
                    console.error("[!] Error al crear backup:", err);
                    await interaction.editReply({ content: `❌ Error al crear el backup: ${err.message}` });
                }
            } else if (subcommand === "ver") {
                const backups = await db.getBackups(guild.id);
                if (backups.length === 0) {
                    return interaction.reply({ content: "❌ No hay backups registrados en este servidor.", ephemeral: true });
                }

                const list = backups.map((bk, i) => 
                    `**#${i + 1}** | ID: \`${bk.id}\` | Fecha: <t:${Math.floor(bk.timestamp / 1000)}:R>\n` +
                    `└ Canales: \`${bk.channelsCount}\` | Roles: \`${bk.rolesCount}\``
                ).join("\n\n");

                const embed = new EmbedBuilder()
                    .setTitle(`🗂️ Backups Disponibles (${backups.length}/3)`)
                    .setDescription(list)
                    .setColor("#7F00FF");

                await interaction.reply({ embeds: [embed] });
            }
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ No tienes permisos.");
            const action = args[0] ? args[0].toLowerCase() : "";
            const guild = message.guild;

            if (action === "crear") {
                const msg = await message.reply("📸 Tomando snapshot del servidor, por favor espera...");
                
                try {
                    const rolesRaw = await guild.roles.fetch();
                    const roles = rolesRaw.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({
                        name: r.name,
                        color: r.color,
                        permissions: r.permissions.bitfield.toString(),
                        position: r.position
                    }));

                    const channelsRaw = await guild.channels.fetch();
                    const channels = channelsRaw.map(c => ({
                        name: c.name,
                        type: c.type,
                        position: c.position,
                        parentId: c.parentId
                    }));

                    const backupId = await db.saveBackup(guild.id, {
                        guildName: guild.name,
                        rolesCount: roles.length,
                        channelsCount: channels.length,
                        roles,
                        channels
                    });

                    await msg.edit(`${Emojis.checkVerify} **Backup manual creado.** ID: \`${backupId}\` (${channels.length} canales, ${roles.length} roles).`);
                } catch (err) {
                    await msg.edit(`❌ Error al crear backup: ${err.message}`);
                }
            } else {
                const backups = await db.getBackups(guild.id);
                if (backups.length === 0) return message.reply("❌ No hay backups.");
                const count = backups.length;
                await message.reply(`🗂️ Hay **${count}** backups disponibles. Usa comandos slash \`/recovery-backup ver\` para ver detalles.`);
            }
        }
    },
    {
        name: "recovery-restaurar",
        description: "🔴 RESTAURACIÓN CRÍTICA — Restaura roles y canales del último backup.",
        category: "recovery",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt.setName("backup_id").setDescription("ID del backup (vacío para usar el más reciente)").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            const guild = interaction.guild;
            const backupId = interaction.options.getString("backup_id");
            const backups = await db.getBackups(guild.id);

            if (backups.length === 0) {
                return interaction.reply({ content: "❌ No hay ningún backup registrado para este servidor.", ephemeral: true });
            }

            const bk = backupId ? backups.find(b => b.id === backupId) : backups[0];
            if (!bk) return interaction.reply({ content: "❌ Backup no encontrado.", ephemeral: true });

            // Confirmación
            const confirm = new ButtonBuilder().setCustomId("confirm_restore").setLabel("🔴 RESTAURAR AHORA").setStyle(ButtonStyle.Danger);
            const cancel = new ButtonBuilder().setCustomId("cancel_restore").setLabel("Cancelar").setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder().addComponents(confirm, cancel);

            const response = await interaction.reply({
                content: `⚠️ **ALERTA CRÍTICA** ⚠️\nEstás a punto de restaurar **${bk.channelsCount} canales** y **${bk.rolesCount} roles** del backup \`${bk.id}\` (<t:${Math.floor(bk.timestamp / 1000)}:R>).\nEsto recreará los elementos faltantes. ¿Confirmar acción?`,
                components: [row],
                ephemeral: true
            });

            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 20000 });
                if (confirmation.customId === "confirm_restore") {
                    await confirmation.update({ content: "🔄 Restauración en proceso. Recreando canales y roles faltantes...", components: [] });

                    // 1. Restaurar Roles Faltantes
                    const currentRoles = await guild.roles.fetch();
                    for (const rBk of bk.roles) {
                        const exists = currentRoles.some(r => r.name === rBk.name);
                        if (!exists) {
                            await guild.roles.create({
                                name: rBk.name,
                                color: rBk.color,
                                hoist: rBk.hoist,
                                permissions: BigInt(rBk.permissions),
                                mentionable: rBk.mentionable
                            }).catch(err => console.error(`Error al recrear rol ${rBk.name}:`, err.message));
                        }
                    }

                    // 2. Restaurar Canales Faltantes
                    const currentChannels = await guild.channels.cache;
                    const categoryMap = new Map(); // Para mapear IDs antiguas de categorías a nuevas recreadas

                    // Primero recrear categorías (tipo 4)
                    const categoriesBk = bk.channels.filter(c => c.type === 4);
                    for (const catBk of categoriesBk) {
                        let cat = currentChannels.find(c => c.name === catBk.name && c.type === 4);
                        if (!cat) {
                            cat = await guild.channels.create({
                                name: catBk.name,
                                type: 4
                            }).catch(() => null);
                        }
                        if (cat) {
                            categoryMap.set(catBk.id, cat.id);
                        }
                    }

                    // Recrear canales de texto (tipo 0) y voz (tipo 2)
                    for (const chBk of bk.channels) {
                        if (chBk.type === 4) continue; // Ya procesadas
                        
                        const exists = currentChannels.some(c => c.name === chBk.name && c.type === chBk.type);
                        if (!exists) {
                            const parentId = chBk.parentId ? categoryMap.get(chBk.parentId) : null;
                            await guild.channels.create({
                                name: chBk.name,
                                type: chBk.type,
                                topic: chBk.topic,
                                parent: parentId,
                                nsfw: chBk.nsfw,
                                rateLimitPerUser: chBk.rateLimitPerUser
                            }).catch(err => console.error(`Error al recrear canal ${chBk.name}:`, err.message));
                        }
                    }

                    await interaction.channel.send({ content: `${Emojis.checkVerify} **Restauración de estructura completada.** Se han validado y recreado canales y roles según el snapshot \`${bk.id}\`.` });
                } else {
                    await confirmation.update({ content: "Restauración cancelada.", components: [] });
                }
            } catch (err) {
                console.error(err);
                await interaction.followUp({ content: "Ocurrió un error o la sesión expiró.", ephemeral: true });
            }
        },
        async executePrefix(message, args) {
            await message.reply("❌ Este comando requiere confirmación y solo puede ser ejecutado vía slash command `/recovery-restaurar`.");
        }
    },
    {
        name: "recovery-pausa",
        description: "PAUSA todos los canales cerrando la escritura a @everyone.",
        category: "recovery",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            await interaction.deferReply();
            const everyone = interaction.guild.roles.everyone;
            const channels = await interaction.guild.channels.fetch();

            let count = 0;
            for (const [id, c] of channels) {
                if (c.isTextBitrate && c.type === 0) { // Canales de texto
                    await c.permissionOverwrites.edit(everyone, { SendMessages: false })
                        .catch(() => {});
                    count++;
                }
            }

            await interaction.editReply({ content: `${Emojis.prohibicion} **Pausa de Servidor Activada.** Se bloqueó la escritura en \`${count}\` canales de texto para @everyone.` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sin permisos.");
            const everyone = message.guild.roles.everyone;
            const channels = message.guild.channels.cache;

            let count = 0;
            for (const [id, c] of channels) {
                if (c.type === 0) {
                    await c.permissionOverwrites.edit(everyone, { SendMessages: false }).catch(() => {});
                    count++;
                }
            }
            await message.reply(`${Emojis.prohibicion} **Pausa Activada.** Escritura cerrada en \`${count}\` canales.`);
        }
    },
    {
        name: "recovery-reanudar",
        description: "Reactiva la escritura para @everyone en todos los canales de texto.",
        category: "recovery",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            await interaction.deferReply();
            const everyone = interaction.guild.roles.everyone;
            const channels = await interaction.guild.channels.fetch();

            let count = 0;
            for (const [id, c] of channels) {
                if (c.isTextBitrate && c.type === 0) {
                    await c.permissionOverwrites.edit(everyone, { SendMessages: null })
                        .catch(() => {});
                    count++;
                }
            }

            await interaction.editReply({ content: `${Emojis.checkVerify} **Canales Reactivados.** Se habilitó nuevamente la escritura en \`${count}\` canales.` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ Sin permisos.");
            const everyone = message.guild.roles.everyone;
            const channels = message.guild.channels.cache;

            let count = 0;
            for (const [id, c] of channels) {
                if (c.type === 0) {
                    await c.permissionOverwrites.edit(everyone, { SendMessages: null }).catch(() => {});
                    count++;
                }
            }
            await message.reply(`${Emojis.checkVerify} **Canales Reactivados** (\`${count}\` canales).`);
        }
    }
];
