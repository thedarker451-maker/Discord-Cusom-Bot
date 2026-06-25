import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import db from "../scr/database.js";
import Emojis from "../scr/emojis.js";

function resolveMember(message, arg) {
    if (!arg) return null;
    const matches = arg.match(/^<@!?(\d+)>$/);
    const id = matches ? matches[1] : arg;
    return message.guild.members.cache.get(id) || null;
}

function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case "s": return num * 1000;
        case "m": return num * 60000;
        case "h": return num * 3600000;
        case "d": return num * 86400000;
        default: return null;
    }
}

async function sendUserDm(user, action, guildName, reason, duration = null) {
    try {
        const embed = new EmbedBuilder()
            .setTitle(`Sanción Recibida en ${guildName}`)
            .setDescription(`Has sido **${action}** del servidor.`)
            .addFields(
                { name: "Razón", value: reason }
            )
            .setColor("#FF007F")
            .setTimestamp();
        
        if (duration) {
            embed.addFields({ name: "Duración", value: duration });
        }
        
        await user.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        // Ignorar si el usuario tiene DMs cerrados
    }
}

async function logToModLogs(guild, client, caseId, action, target, moderator, reason, duration = null) {
    const settings = await db.getSettings(guild.id);
    if (!settings.logChannel) return;

    const channel = guild.channels.cache.get(settings.logChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `[CASO #${caseId}] ${action.toUpperCase()}`, iconURL: target.displayAvatarURL() })
        .setColor(action.includes("ban") || action.includes("kick") ? "#FF007F" : "#A855F7")
        .addFields(
            { name: "Usuario", value: `${target} (\`${target.id}\`)`, inline: true },
            { name: "Moderador", value: `${moderator} (\`${moderator.id}\`)`, inline: true },
            { name: "Razón", value: reason, inline: false }
        )
        .setTimestamp();

    if (duration) {
        embed.addFields({ name: "Duración", value: duration, inline: true });
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
}

export const moderationCommands = [
    {
        name: "kick",
        description: "Expulsa a un miembro del servidor.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a expulsar").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const reason = interaction.options.getString("razon") || "No especificada";
            const member = interaction.guild.members.cache.get(user.id);
            
            if (!member) return interaction.reply({ content: "❌ No está en el servidor.", ephemeral: true });
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });
            if (!member.kickable) return interaction.reply({ content: "❌ No puedo expulsar a este usuario.", ephemeral: true });

            await sendUserDm(user, "expulsado/a", interaction.guild.name, reason);
            await member.kick(reason);

            const caseId = await db.addCase(interaction.guild.id, {
                type: "kick",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason
            });

            await logToModLogs(interaction.guild, interaction.client, caseId, "kick", user, interaction.user, reason);
            await interaction.reply({ content: `${Emojis.moderator} **${user.tag}** ha sido expulsado por la razón: \`${reason}\` (Caso #${caseId})` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("❌ No tengo permisos.");
            
            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");
            if (!member.kickable) return message.reply("❌ No puedo expulsarlo.");

            const reason = args.slice(1).join(" ") || "No especificada";
            const user = member.user;

            await sendUserDm(user, "expulsado/a", message.guild.name, reason);
            await member.kick(reason);

            const caseId = await db.addCase(message.guild.id, {
                type: "kick",
                targetId: user.id,
                moderatorId: message.author.id,
                reason
            });

            await logToModLogs(message.guild, message.client, caseId, "kick", user, message.author, reason);
            await message.reply(`${Emojis.moderator} **${user.tag}** ha sido expulsado. Razón: \`${reason}\` (Caso #${caseId})`);
        }
    },
    {
        name: "ban",
        description: "Banea a un miembro del servidor.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a banear").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const reason = interaction.options.getString("razon") || "No especificada";
            const member = interaction.guild.members.cache.get(user.id);

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });
            if (member && !member.bannable) return interaction.reply({ content: "❌ No puedo banear a este usuario.", ephemeral: true });

            await sendUserDm(user, "baneado/a", interaction.guild.name, reason);
            await interaction.guild.members.ban(user.id, { reason });

            const caseId = await db.addCase(interaction.guild.id, {
                type: "ban",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason
            });

            await logToModLogs(interaction.guild, interaction.client, caseId, "ban", user, interaction.user, reason);
            await interaction.reply({ content: `${Emojis.banHammer} **${user.tag}** ha sido baneado permanentemente. Razón: \`${reason}\` (Caso #${caseId})` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tengo permisos.");
            if (!args[0]) return message.reply("❌ Menciona a un usuario o ID.");

            const matches = args[0].match(/^<@!?(\d+)>$/);
            const userId = matches ? matches[1] : args[0];
            const member = message.guild.members.cache.get(userId);
            
            if (member && !member.bannable) return message.reply("❌ No puedo banear a este usuario.");
            
            const reason = args.slice(1).join(" ") || "No especificada";
            
            // Intentar fetch del usuario para tener la info
            const user = await message.client.users.fetch(userId).catch(() => null);
            if (!user) return message.reply("❌ Usuario no encontrado.");

            await sendUserDm(user, "baneado/a", message.guild.name, reason);
            await message.guild.members.ban(userId, { reason });

            const caseId = await db.addCase(message.guild.id, {
                type: "ban",
                targetId: userId,
                moderatorId: message.author.id,
                reason
            });

            await logToModLogs(message.guild, message.client, caseId, "ban", user, message.author, reason);
            await message.reply(`${Emojis.banHammer} Usuario **${user.tag}** baneado. Razón: \`${reason}\` (Caso #${caseId})`);
        }
    },
    {
        name: "unban",
        description: "Remueve el baneo de un usuario por su ID.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt.setName("id_usuario").setDescription("ID del usuario desbaneado").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
        },
        async executeSlash(interaction) {
            const userId = interaction.options.getString("id_usuario");
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });

            try {
                await interaction.guild.members.unban(userId);
                const user = await interaction.client.users.fetch(userId).catch(() => null);
                
                const caseId = await db.addCase(interaction.guild.id, {
                    type: "unban",
                    targetId: userId,
                    moderatorId: interaction.user.id,
                    reason: "Desbaneo de ID"
                });

                if (user) {
                    await logToModLogs(interaction.guild, interaction.client, caseId, "unban", user, interaction.user, "Desbaneo");
                }

                await interaction.reply(`${Emojis.checkVerify} Baneo de **${user ? user.tag : userId}** removido. (Caso #${caseId})`);
            } catch {
                await interaction.reply({ content: "❌ No se encontró baneo para esa ID.", ephemeral: true });
            }
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tengo permisos.");
            
            const userId = args[0];
            if (!userId) return message.reply("❌ Proporciona la ID.");

            try {
                await message.guild.members.unban(userId);
                const user = await message.client.users.fetch(userId).catch(() => null);

                const caseId = await db.addCase(message.guild.id, {
                    type: "unban",
                    targetId: userId,
                    moderatorId: message.author.id,
                    reason: "Desbaneo de ID"
                });

                if (user) {
                    await logToModLogs(message.guild, message.client, caseId, "unban", user, message.author, "Desbaneo");
                }

                await message.reply(`${Emojis.checkVerify} Baneo de **${user ? user.tag : userId}** removido. (Caso #${caseId})`);
            } catch {
                await message.reply("❌ No se pudo desbanear o no existe baneo.");
            }
        }
    },
    {
        name: "warn",
        description: "Emite una advertencia a un miembro y la acumula en el historial.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a advertir").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón de la advertencia").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const reason = interaction.options.getString("razon");
            const member = interaction.guild.members.cache.get(user.id);

            if (!member) return interaction.reply({ content: "❌ No está en el servidor.", ephemeral: true });
            
            // Guardar advertencia
            const caseId = await db.addCase(interaction.guild.id, {
                type: "warn",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason
            });

            // Obtener historial para contar advertencias
            const cases = await db.getCases(interaction.guild.id);
            const userWarns = cases.filter(c => c.targetId === user.id && c.type === "warn").length;

            await sendUserDm(user, `advertido/a (Advertencia #${userWarns})`, interaction.guild.name, reason);
            await logToModLogs(interaction.guild, interaction.client, caseId, "warn", user, interaction.user, reason);

            // Determinar color según severidad (ejemplo.md)
            let warnColor = Emojis.warnColors.safe;
            if (userWarns === 3) warnColor = Emojis.warnColors.warning;
            else if (userWarns === 4) warnColor = Emojis.warnColors.danger;
            else if (userWarns >= 5) warnColor = Emojis.warnColors.critical;

            // Auto-sanción: 3 warns -> mute 1h, 5 warns -> ban
            let autoPunishMsg = "";
            if (userWarns >= 5 && member.bannable) {
                await sendUserDm(user, "auto-baneado/a (Límite de 5 warns alcanzado)", interaction.guild.name, "Acumulación de advertencias");
                await member.ban({ reason: "Límite de 5 advertencias alcanzado" });
                autoPunishMsg = `\n${Emojis.banHammer} **Auto-Sanción:** El usuario ha sido baneado automáticamente por acumular 5 advertencias.`;
            } else if (userWarns >= 3 && member.moderatable) {
                await member.timeout(60 * 60 * 1000, "Acumulación de 3 advertencias");
                autoPunishMsg = `\n${Emojis.muted} **Auto-Sanción:** El usuario ha sido silenciado por 1 hora por acumular 3 advertencias.`;
            }

            // Embed de advertencia con colores según ejemplo.md
            const warnEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.info} Advertencia n°${userWarns}`)
                .setDescription(`Hola, Esta es la **advertencia n°${userWarns}**/**5**`)
                .addFields(
                    { name: `${Emojis.info} Motivo`, value: reason, inline: true },
                    { name: `${Emojis.moderator} Moderador`, value: `[${interaction.user.tag}](https://discord.com/users/${interaction.user.id})`, inline: true }
                )
                .setColor(warnColor)
                .setTimestamp();

            await interaction.reply({ embeds: [warnEmbed], content: autoPunishMsg || null });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");
            
            const reason = args.slice(1).join(" ");
            if (!reason) return message.reply("❌ Debes especificar una razón para la advertencia.");
            const user = member.user;

            const caseId = await db.addCase(message.guild.id, {
                type: "warn",
                targetId: user.id,
                moderatorId: message.author.id,
                reason
            });

            const cases = await db.getCases(message.guild.id);
            const userWarns = cases.filter(c => c.targetId === user.id && c.type === "warn").length;

            await sendUserDm(user, `advertido/a (Advertencia #${userWarns})`, message.guild.name, reason);
            await logToModLogs(message.guild, message.client, caseId, "warn", user, message.author, reason);

            // Determinar color según severidad (ejemplo.md)
            let warnColor = Emojis.warnColors.safe;
            if (userWarns === 3) warnColor = Emojis.warnColors.warning;
            else if (userWarns === 4) warnColor = Emojis.warnColors.danger;
            else if (userWarns >= 5) warnColor = Emojis.warnColors.critical;

            let autoPunishMsg = "";
            if (userWarns >= 5 && member.bannable) {
                await member.ban({ reason: "Límite de 5 advertencias alcanzado" });
                autoPunishMsg = `\n${Emojis.banHammer} **Auto-Sanción:** Baneado automáticamente por acumular 5 advertencias.`;
            } else if (userWarns >= 3 && member.moderatable) {
                await member.timeout(60 * 60 * 1000, "Acumulación de 3 advertencias");
                autoPunishMsg = `\n${Emojis.muted} **Auto-Sanción:** Silenciado por 1 hora por acumular 3 advertencias.`;
            }

            // Embed de advertencia con colores según ejemplo.md
            const warnEmbed = new EmbedBuilder()
                .setTitle(`${Emojis.info} Advertencia n°${userWarns}`)
                .setDescription(`Hola, Esta es la **advertencia n°${userWarns}**/**5**`)
                .addFields(
                    { name: `${Emojis.info} Motivo`, value: reason, inline: true },
                    { name: `${Emojis.moderator} Moderador`, value: `[${message.author.tag}](https://discord.com/users/${message.author.id})`, inline: true }
                )
                .setColor(warnColor)
                .setTimestamp();

            await message.reply({ embeds: [warnEmbed], content: autoPunishMsg || null });
        }
    },
    {
        name: "mute",
        description: "Silencia temporalmente a un miembro en el servidor (Timeout).",
        category: "moderacion",
        aliases: ["timeout"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a silenciar").setRequired(true))
                .addIntegerOption(opt => opt.setName("minutos").setDescription("Tiempo en minutos").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const duration = interaction.options.getInteger("minutos");
            const reason = interaction.options.getString("razon") || "No especificada";
            const member = interaction.guild.members.cache.get(user.id);

            if (!member) return interaction.reply({ content: "❌ No está en el servidor.", ephemeral: true });
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });
            if (!member.moderatable) return interaction.reply({ content: "❌ No puedo silenciar a este usuario.", ephemeral: true });

            await sendUserDm(user, "silenciado/a", interaction.guild.name, reason, `${duration} minutos`);
            await member.timeout(duration * 60 * 1000, reason);

            const caseId = await db.addCase(interaction.guild.id, {
                type: "mute",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason,
                duration: `${duration}m`
            });

            await logToModLogs(interaction.guild, interaction.client, caseId, "mute", user, interaction.user, reason, `${duration}m`);
            await interaction.reply(`${Emojis.muted} **${user.tag}** ha sido silenciado por \`${duration} minutos\`. Razón: \`${reason}\` (Caso #${caseId})`);
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("❌ No tengo permisos.");

            const member = resolveMember(message, args[0]);
            const duration = parseInt(args[1]);

            if (!member || isNaN(duration) || duration <= 0) {
                return message.reply("❌ Uso: `!mute <@usuario> <minutos> [razón]`");
            }
            if (!member.moderatable) return message.reply("❌ No puedo silenciar a este usuario.");

            const reason = args.slice(2).join(" ") || "No especificada";
            const user = member.user;

            await sendUserDm(user, "silenciado/a", message.guild.name, reason, `${duration} minutos`);
            await member.timeout(duration * 60 * 1000, reason);

            const caseId = await db.addCase(message.guild.id, {
                type: "mute",
                targetId: user.id,
                moderatorId: message.author.id,
                reason,
                duration: `${duration}m`
            });

            await logToModLogs(message.guild, message.client, caseId, "mute", user, message.author, reason, `${duration}m`);
            await message.reply(`${Emojis.muted} **${user.tag}** silenciado por \`${duration} minutos\`. Razón: \`${reason}\` (Caso #${caseId})`);
        }
    },
    {
        name: "unmute",
        description: "Remueve el silencio temporal (Timeout) de un miembro.",
        category: "moderacion",
        aliases: ["untimeout"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a quitar silencio").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const member = interaction.guild.members.cache.get(user.id);

            if (!member) return interaction.reply({ content: "❌ No está en el servidor.", ephemeral: true });
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });

            await member.timeout(null);
            
            const caseId = await db.addCase(interaction.guild.id, {
                type: "unmute",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason: "Des-silenciado manualmente"
            });

            await logToModLogs(interaction.guild, interaction.client, caseId, "unmute", user, interaction.user, "Remoción de timeout");
            await interaction.reply(`${Emojis.checkVerify} Se ha removido el silencio de **${user.tag}**.`);
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("❌ No tengo permisos.");

            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");

            await member.timeout(null);
            const user = member.user;

            const caseId = await db.addCase(message.guild.id, {
                type: "unmute",
                targetId: user.id,
                moderatorId: message.author.id,
                reason: "Des-silenciado"
            });

            await logToModLogs(message.guild, message.client, caseId, "unmute", user, message.author, "Remoción de timeout");
            await message.reply(`${Emojis.checkVerify} Se ha removido el silencio de **${user.tag}**.`);
        }
    },
    {
        name: "clear",
        description: "Elimina masivamente mensajes de este canal.",
        category: "moderacion",
        aliases: ["purge"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(opt => opt.setName("cantidad").setDescription("Cantidad de mensajes (1-100)").setRequired(true).setMinValue(1).setMaxValue(100))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const amount = interaction.options.getInteger("cantidad");
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });

            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `🧹 Se eliminaron \`${deleted.size}\` mensajes de este canal.`, ephemeral: true });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tengo permisos.");

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) return message.reply("❌ Uso: `!clear <1-100>`");

            await message.channel.bulkDelete(amount + 1, true);
            const statusMsg = await message.channel.send(`🧹 Se eliminaron \`${amount}\` mensajes.`);
            setTimeout(() => statusMsg.delete().catch(() => {}), 4000);
        }
    },
    {
        name: "slowmode",
        description: "Activa o desactiva el modo lento en este canal.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(opt => opt.setName("segundos").setDescription("Tiempo en segundos (0 para apagar)").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
        },
        async executeSlash(interaction) {
            const seconds = interaction.options.getInteger("segundos");
            await interaction.channel.setRateLimitPerUser(seconds);
            await interaction.reply({ content: `${Emojis.checkVerify} Se ha configurado el modo lento de este canal a \`${seconds}s\`.` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No tienes permisos.");
            const seconds = parseInt(args[0]);
            if (isNaN(seconds)) return message.reply("❌ Uso: `!slowmode <segundos>`");

            await message.channel.setRateLimitPerUser(seconds);
            await message.reply(`${Emojis.checkVerify} Modo lento configurado a \`${seconds}s\`.`);
        }
    },
    {
        name: "lockdown",
        description: "Bloquea o desbloquea la escritura en este canal para @everyone.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addBooleanOption(opt => opt.setName("bloquear").setDescription("True para bloquear, False para desbloquear").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
        },
        async executeSlash(interaction) {
            const block = interaction.options.getBoolean("bloquear");
            const everyone = interaction.guild.roles.everyone;

            if (block) {
                await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: false });
                await interaction.reply({ content: `${Emojis.prohibicion} **Canal Bloqueado.** Los usuarios no pueden escribir aquí.` });
            } else {
                await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: null });
                await interaction.reply({ content: `${Emojis.checkVerify} **Canal Desbloqueado.** Los usuarios pueden volver a escribir.` });
            }
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply("❌ No tienes permisos.");
            const arg = args[0] ? args[0].toLowerCase() : "";
            const everyone = message.guild.roles.everyone;

            if (arg === "on" || arg === "true" || arg === "yes") {
                await message.channel.permissionOverwrites.edit(everyone, { SendMessages: false });
                await message.reply(`${Emojis.prohibicion} **Canal Bloqueado.**`);
            } else {
                await message.channel.permissionOverwrites.edit(everyone, { SendMessages: null });
                await message.reply(`${Emojis.checkVerify} **Canal Desbloqueado.**`);
            }
        }
    },
    {
        name: "nuke",
        description: "Recrea el canal actual para borrar todo su historial de mensajes.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        },
        async executeSlash(interaction) {
            // Confirmación vía botón
            const confirm = new ButtonBuilder().setCustomId("confirm_nuke").setLabel("💣 CONFIRMAR NUKE").setStyle(ButtonStyle.Danger);
            const cancel = new ButtonBuilder().setCustomId("cancel_nuke").setLabel("Cancelar").setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder().addComponents(confirm, cancel);

            const response = await interaction.reply({
                content: `⚠️ **¡ATENCIÓN!** Estás a punto de clonar y borrar este canal completo. Esto es irreversible. ¿Deseas continuar?`,
                components: [row],
                ephemeral: true
            });

            const filter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({ filter, time: 15000 });
                if (confirmation.customId === "confirm_nuke") {
                    const channel = interaction.channel;
                    const position = channel.position;
                    const clonedChannel = await channel.clone();
                    await channel.delete();
                    await clonedChannel.setPosition(position);
                    await clonedChannel.send({ content: `${Emojis.checkVerify} **Canal Recreado (Nuke) exitosamente.**` });
                } else {
                    await confirmation.update({ content: "Nuke cancelado.", components: [] });
                }
            } catch {
                await interaction.editReply({ content: "Confirmación expirada. Nuke cancelado.", components: [] });
            }
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("❌ No tienes permisos.");
            const channel = message.channel;
            const position = channel.position;
            const clonedChannel = await channel.clone();
            await channel.delete();
            await clonedChannel.setPosition(position);
            await clonedChannel.send({ content: `${Emojis.checkVerify} **Canal Recreado (Nuke) exitosamente.**` });
        }
    },
    {
        name: "cases",
        description: "Muestra el historial de casos de moderación del servidor o de un usuario.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Filtrar por usuario").setRequired(false))
                .addIntegerOption(opt => opt.setName("caso_id").setDescription("Ver un caso específico por ID").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const caseId = interaction.options.getInteger("caso_id");
            const cases = await db.getCases(interaction.guild.id);

            if (caseId) {
                const c = cases.find(item => item.id === caseId);
                if (!c) return interaction.reply({ content: `❌ No se encontró el caso con ID \`${caseId}\`.`, ephemeral: true });

                const target = await interaction.client.users.fetch(c.targetId).catch(() => null);
                const mod = await interaction.client.users.fetch(c.moderatorId).catch(() => null);

                const embed = new EmbedBuilder()
                    .setTitle(`🛡️ Detalle del Caso #${c.id}`)
                    .setColor(c.type.includes("ban") || c.type.includes("kick") ? "#FF007F" : "#A855F7")
                    .addFields(
                        { name: "Tipo", value: `\`${c.type.toUpperCase()}\``, inline: true },
                        { name: "Fecha", value: `<t:${Math.floor(c.timestamp / 1000)}:f>`, inline: true },
                        { name: "Usuario", value: target ? `${target} (\`${c.targetId}\`)` : `\`${c.targetId}\``, inline: false },
                        { name: "Moderador", value: mod ? `${mod} (\`${c.moderatorId}\`)` : `\`${c.moderatorId}\``, inline: false },
                        { name: "Razón", value: c.reason || "No especificada", inline: false }
                    )
                    .setTimestamp();
                
                if (c.duration) embed.addFields({ name: "Duración", value: c.duration, inline: true });

                return interaction.reply({ embeds: [embed] });
            }

            let filtered = cases;
            let title = `📋 Historial de Casos del Servidor`;
            if (user) {
                filtered = cases.filter(c => c.targetId === user.id);
                title = `📋 Casos de Moderación de ${user.tag}`;
            }

            if (!filtered || filtered.length === 0) {
                return interaction.reply({ content: `✅ No hay casos registrados ${user ? "para este usuario" : "en el servidor"}.`, ephemeral: true });
            }

            // Mostrar los últimos 10
            const recent = filtered.slice(-10).reverse();
            const list = recent.map(c => 
                `**Caso #${c.id}** | \`${c.type.toUpperCase()}\` | Razón: \`${c.reason.substring(0, 50)}\`\n` +
                `└ Moderador: <@${c.moderatorId}> | Fecha: <t:${Math.floor(c.timestamp / 1000)}:R>`
            ).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(list)
                .setColor("#7c5cff")
                .setFooter({ text: `Mostrando los últimos ${recent.length} casos de un total de ${filtered.length}.` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            const cases = await db.getCases(message.guild.id);

            // Verificar si el argumento es un número (ID de caso)
            const potentialId = parseInt(args[0]);
            if (!isNaN(potentialId) && !args[0].startsWith("<@")) {
                const c = cases.find(item => item.id === potentialId);
                if (!c) return message.reply(`❌ No se encontró el caso con ID \`${potentialId}\`.`);

                const target = await message.client.users.fetch(c.targetId).catch(() => null);
                const mod = await message.client.users.fetch(c.moderatorId).catch(() => null);

                const embed = new EmbedBuilder()
                    .setTitle(`🛡️ Detalle del Caso #${c.id}`)
                    .setColor(c.type.includes("ban") || c.type.includes("kick") ? "#FF007F" : "#A855F7")
                    .addFields(
                        { name: "Tipo", value: `\`${c.type.toUpperCase()}\``, inline: true },
                        { name: "Fecha", value: `<t:${Math.floor(c.timestamp / 1000)}:f>`, inline: true },
                        { name: "Usuario", value: target ? `${target} (\`${c.targetId}\`)` : `\`${c.targetId}\``, inline: false },
                        { name: "Moderador", value: mod ? `${mod} (\`${c.moderatorId}\`)` : `\`${c.moderatorId}\``, inline: false },
                        { name: "Razón", value: c.reason || "No especificada", inline: false }
                    );

                if (c.duration) embed.addFields({ name: "Duración", value: c.duration, inline: true });
                return message.reply({ embeds: [embed] });
            }

            const member = resolveMember(message, args[0]);
            let filtered = cases;
            let title = `📋 Historial de Casos del Servidor`;

            if (member) {
                filtered = cases.filter(c => c.targetId === member.user.id);
                title = `📋 Casos de Moderación de ${member.user.tag}`;
            }

            if (!filtered || filtered.length === 0) {
                return message.reply(`✅ No hay casos registrados ${member ? "para este usuario" : "en el servidor"}.`);
            }

            const recent = filtered.slice(-10).reverse();
            const list = recent.map(c => 
                `**Caso #${c.id}** | \`${c.type.toUpperCase()}\` | Razón: \`${c.reason.substring(0, 50)}\`\n` +
                `└ Moderador: <@${c.moderatorId}> | Fecha: <t:${Math.floor(c.timestamp / 1000)}:R>`
            ).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(list)
                .setColor("#7c5cff")
                .setFooter({ text: `Mostrando últimos ${recent.length} de ${filtered.length} total.` });

            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "warns",
        description: "Muestra las advertencias (warns) acumuladas de un usuario.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Usuario para ver advertencias").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const cases = await db.getCases(interaction.guild.id);
            const userWarns = cases.filter(c => c.targetId === user.id && c.type === "warn");

            if (userWarns.length === 0) {
                return interaction.reply({ content: `✅ **${user.tag}** no tiene advertencias activas en el servidor.`, ephemeral: true });
            }

            const list = userWarns.map(c => 
                `• **Caso #${c.id}** | Razón: \`${c.reason}\` | Mod: <@${c.moderatorId}> | Hace: <t:${Math.floor(c.timestamp / 1000)}:R>`
            ).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Advertencias de ${user.tag} (${userWarns.length})`)
                .setDescription(list)
                .setColor("#EAB308")
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");

            const cases = await db.getCases(message.guild.id);
            const userWarns = cases.filter(c => c.targetId === member.user.id && c.type === "warn");

            if (userWarns.length === 0) {
                return message.reply(`✅ **${member.user.tag}** no tiene advertencias.`);
            }

            const list = userWarns.map(c => 
                `• **Caso #${c.id}** | Razón: \`${c.reason}\` | Mod: <@${c.moderatorId}> | Hace: <t:${Math.floor(c.timestamp / 1000)}:R>`
            ).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Advertencias de ${member.user.tag} (${userWarns.length})`)
                .setDescription(list)
                .setColor("#EAB308");

            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "unwarn",
        description: "Elimina una advertencia específica usando el ID del caso.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(opt => opt.setName("caso_id").setDescription("ID del caso de la advertencia a remover").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const caseId = interaction.options.getInteger("caso_id");
            const cases = await db.getCases(interaction.guild.id);

            const cIdx = cases.findIndex(c => c.id === caseId);
            if (cIdx === -1) return interaction.reply({ content: `❌ No se encontró el caso #${caseId}.`, ephemeral: true });

            const c = cases[cIdx];
            if (c.type !== "warn") return interaction.reply({ content: `❌ El caso #${caseId} no es una advertencia (es tipo: \`${c.type}\`).`, ephemeral: true });

            // Cambiar tipo para no desordenar IDs
            c.type = "warn_removed";
            c.removedBy = interaction.user.id;
            c.removedAt = Date.now();
            await db.setCases(interaction.guild.id, cases);

            // Log
            const logCaseId = await db.addCase(interaction.guild.id, {
                type: "unwarn",
                targetId: c.targetId,
                moderatorId: interaction.user.id,
                reason: `Remoción del Caso #${caseId}`
            });

            const targetUser = await interaction.client.users.fetch(c.targetId).catch(() => null);
            if (targetUser) {
                await logToModLogs(interaction.guild, interaction.client, logCaseId, "unwarn", targetUser, interaction.user, `Remoción del Caso #${caseId}`);
            }

            await interaction.reply({ content: `${Emojis.checkVerify} Se ha removido la advertencia del **Caso #${caseId}** (${targetUser ? targetUser.tag : `ID ${c.targetId}`}).` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            const caseId = parseInt(args[0]);
            if (isNaN(caseId)) return message.reply("❌ Uso: `!unwarn <ID_del_caso>`");

            const cases = await db.getCases(message.guild.id);
            const cIdx = cases.findIndex(c => c.id === caseId);
            if (cIdx === -1) return message.reply(`❌ No se encontró el caso #${caseId}.`);

            const c = cases[cIdx];
            if (c.type !== "warn") return message.reply(`❌ El caso #${caseId} no es una advertencia.`);

            c.type = "warn_removed";
            c.removedBy = message.author.id;
            c.removedAt = Date.now();
            await db.setCases(message.guild.id, cases);

            const logCaseId = await db.addCase(message.guild.id, {
                type: "unwarn",
                targetId: c.targetId,
                moderatorId: message.author.id,
                reason: `Remoción del Caso #${caseId}`
            });

            const targetUser = await message.client.users.fetch(c.targetId).catch(() => null);
            if (targetUser) {
                await logToModLogs(message.guild, message.client, logCaseId, "unwarn", targetUser, message.author, `Remoción del Caso #${caseId}`);
            }

            await message.reply(`${Emojis.checkVerify} Se ha removido la advertencia del **Caso #${caseId}**.`);
        }
    },
    {
        name: "clearwarns",
        description: "Elimina todas las advertencias (warns) de un usuario.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Usuario para remover advertencias").setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const cases = await db.getCases(interaction.guild.id);

            let count = 0;
            cases.forEach(c => {
                if (c.targetId === user.id && c.type === "warn") {
                    c.type = "warn_removed";
                    c.removedBy = interaction.user.id;
                    c.removedAt = Date.now();
                    count++;
                }
            });

            if (count === 0) return interaction.reply({ content: `❌ **${user.tag}** no tiene advertencias para limpiar.`, ephemeral: true });

            await db.setCases(interaction.guild.id, cases);

            const logCaseId = await db.addCase(interaction.guild.id, {
                type: "clearwarns",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason: `Limpieza total (${count} advertencias removidas)`
            });

            await logToModLogs(interaction.guild, interaction.client, logCaseId, "clearwarns", user, interaction.user, `Limpieza total de advertencias`);

            await interaction.reply({ content: `${Emojis.checkVerify} Se han limpiado las **${count}** advertencias de **${user.tag}**.` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("❌ No tienes permisos.");
            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");

            const user = member.user;
            const cases = await db.getCases(message.guild.id);

            let count = 0;
            cases.forEach(c => {
                if (c.targetId === user.id && c.type === "warn") {
                    c.type = "warn_removed";
                    c.removedBy = message.author.id;
                    c.removedAt = Date.now();
                    count++;
                }
            });

            if (count === 0) return message.reply(`❌ **${user.tag}** no tiene advertencias para limpiar.`);

            await db.setCases(message.guild.id, cases);

            const logCaseId = await db.addCase(message.guild.id, {
                type: "clearwarns",
                targetId: user.id,
                moderatorId: message.author.id,
                reason: `Limpieza total (${count} advertencias)`
            });

            await logToModLogs(message.guild, message.client, logCaseId, "clearwarns", user, message.author, `Limpieza total de advertencias`);

            await message.reply(`${Emojis.checkVerify} Se han limpiado las **${count}** advertencias de **${user.tag}**.`);
        }
    },
    {
        name: "tempban",
        description: "Banea temporalmente a un usuario del servidor.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a banear").setRequired(true))
                .addStringOption(opt => opt.setName("tiempo").setDescription("Tiempo (ej: 10m, 2h, 1d)").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón del ban").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const timeStr = interaction.options.getString("tiempo");
            const reason = interaction.options.getString("razon") || "No especificada";
            const member = interaction.guild.members.cache.get(user.id);

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });
            if (member && !member.bannable) return interaction.reply({ content: "❌ No puedo banear a este usuario.", ephemeral: true });

            const durationMs = parseDuration(timeStr);
            if (!durationMs) return interaction.reply({ content: "❌ Formato de tiempo inválido. Usa por ejemplo: `30m`, `2h`, `1d`.", ephemeral: true });

            await sendUserDm(user, "baneado/a temporalmente", interaction.guild.name, reason, timeStr);
            await interaction.guild.members.ban(user.id, { reason: `Tempban (${timeStr}): ${reason}` });

            const caseId = await db.addCase(interaction.guild.id, {
                type: "tempban",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason,
                duration: timeStr
            });

            // Guardar en la base de datos para el worker
            const tempbansKey = `tempbans:${interaction.guild.id}`;
            const tempbans = await db.get(tempbansKey, []);
            tempbans.push({
                userId: user.id,
                expires: Date.now() + durationMs,
                caseId
            });
            await db.set(tempbansKey, tempbans);

            await logToModLogs(interaction.guild, interaction.client, caseId, "tempban", user, interaction.user, reason, timeStr);

            await interaction.reply({ content: `${Emojis.banHammer} **${user.tag}** ha sido baneado por **${timeStr}**. Razón: \`${reason}\` (Caso #${caseId})` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tengo permisos.");

            if (args.length < 2) return message.reply("❌ Uso: `!tempban <@usuario> <tiempo> [razón]` (ej: `!tempban @user 1d SPAM`)");

            const member = resolveMember(message, args[0]);
            const timeStr = args[1];
            const reason = args.slice(2).join(" ") || "No especificada";

            const userId = member ? member.user.id : args[0].replace(/[^0-9]/g, "");
            const user = await message.client.users.fetch(userId).catch(() => null);
            if (!user) return message.reply("❌ Usuario no encontrado.");

            if (member && !member.bannable) return message.reply("❌ No puedo banear a este usuario.");

            const durationMs = parseDuration(timeStr);
            if (!durationMs) return message.reply("❌ Formato de tiempo inválido. Usa por ejemplo: `30m`, `2h`, `1d`.");

            await sendUserDm(user, "baneado/a temporalmente", message.guild.name, reason, timeStr);
            await message.guild.members.ban(user.id, { reason: `Tempban (${timeStr}): ${reason}` });

            const caseId = await db.addCase(message.guild.id, {
                type: "tempban",
                targetId: user.id,
                moderatorId: message.author.id,
                reason,
                duration: timeStr
            });

            // Guardar para worker
            const tempbansKey = `tempbans:${message.guild.id}`;
            const tempbans = await db.get(tempbansKey, []);
            tempbans.push({
                userId: user.id,
                expires: Date.now() + durationMs,
                caseId
            });
            await db.set(tempbansKey, tempbans);

            await logToModLogs(message.guild, message.client, caseId, "tempban", user, message.author, reason, timeStr);

            await message.reply(`${Emojis.banHammer} **${user.tag}** baneado por **${timeStr}**. Razón: \`${reason}\` (Caso #${caseId})`);
        }
    },
    {
        name: "softban",
        description: "Banea y desbanea de inmediato a un miembro para borrar sus mensajes de los últimos 7 días.",
        category: "moderacion",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro a purgar").setRequired(true))
                .addStringOption(opt => opt.setName("razon").setDescription("Razón del softban").setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario");
            const reason = interaction.options.getString("razon") || "No especificada (Softban)";
            const member = interaction.guild.members.cache.get(user.id);

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "❌ No tengo permisos.", ephemeral: true });
            if (member && !member.bannable) return interaction.reply({ content: "❌ No puedo banear a este usuario.", ephemeral: true });

            await sendUserDm(user, "baneado/a (Softban: baneo y desbaneo inmediato para purga de mensajes)", interaction.guild.name, reason);
            
            // Banear borrando mensajes de 7 días (604800 segundos)
            await interaction.guild.members.ban(user.id, { deleteMessageSeconds: 604800, reason: `Softban: ${reason}` });
            // Desbanear de inmediato
            await interaction.guild.members.unban(user.id, "Softban (Desbaneo inmediato)");

            const caseId = await db.addCase(interaction.guild.id, {
                type: "softban",
                targetId: user.id,
                moderatorId: interaction.user.id,
                reason
            });

            await logToModLogs(interaction.guild, interaction.client, caseId, "softban", user, interaction.user, reason);

            await interaction.reply({ content: `${Emojis.checkVerify} **${user.tag}** ha recibido un softban (mensajes de los últimos 7 días purgados). (Caso #${caseId})` });
        },
        async executePrefix(message, args) {
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tienes permisos.");
            if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("❌ No tengo permisos.");

            const member = resolveMember(message, args[0]);
            if (!member) return message.reply("❌ Menciona a un miembro válido.");

            const reason = args.slice(1).join(" ") || "No especificada (Softban)";
            const user = member.user;

            await sendUserDm(user, "baneado/a (Softban: baneo y desbaneo inmediato para purga de mensajes)", message.guild.name, reason);
            
            await message.guild.members.ban(user.id, { deleteMessageSeconds: 604800, reason: `Softban: ${reason}` });
            await message.guild.members.unban(user.id, "Softban (Desbaneo inmediato)");

            const caseId = await db.addCase(message.guild.id, {
                type: "softban",
                targetId: user.id,
                moderatorId: message.author.id,
                reason
            });

            await logToModLogs(message.guild, message.client, caseId, "softban", user, message.author, reason);

            await message.reply(`${Emojis.checkVerify} **${user.tag}** ha recibido un softban. Mensajes purgados.`);
        }
    }
];
