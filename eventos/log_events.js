import { EmbedBuilder, ChannelType } from "discord.js";
import db from "../scr/database.js";
import Emojis from "../scr/emojis.js";

// Helper para traducir tipos de canales a español
function getChannelTypeName(type) {
    switch (type) {
        case ChannelType.GuildText: return "Texto";
        case ChannelType.GuildVoice: return "Voz";
        case ChannelType.GuildCategory: return "Categoría";
        case ChannelType.GuildAnnouncement: return "Anuncios";
        case ChannelType.AnnouncementThread: return "Hilo de Anuncios";
        case ChannelType.PublicThread: return "Hilo Público";
        case ChannelType.PrivateThread: return "Hilo Privado";
        case ChannelType.GuildStageVoice: return "Escenario";
        default: return "Otro";
    }
}

export function setupLogEvents(client) {
    // 1. Mensaje Eliminado
    client.on("messageDelete", async (message) => {
        if (message.author?.bot || !message.guild) return;

        try {
            const settings = await db.getSettings(message.guild.id);
            if (!settings.logChannel) return;

            const channel = message.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const content = message.content ? message.content.substring(0, 1000) : "*Sin contenido de texto*";
            const attachmentInfo = message.attachments.size > 0
                ? `\n📎 **Archivos adjuntos:** ${message.attachments.map(a => `[${a.name}](${a.url})`).join(", ")}`
                : "";

            const embed = new EmbedBuilder()
                .setTitle("🗑️ Mensaje Eliminado")
                .setColor("#EF4444")
                .addFields(
                    { name: "Autor", value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                    { name: "Canal", value: `${message.channel} (\`${message.channel.id}\`)`, inline: true },
                    { name: "Contenido", value: content + attachmentInfo }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de mensaje eliminado:", error);
        }
    });

    // 2. Mensaje Editado
    client.on("messageUpdate", async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return; // Si no cambió el texto (ej: se agregó un embed)

        try {
            const settings = await db.getSettings(oldMessage.guild.id);
            if (!settings.logChannel) return;

            const channel = oldMessage.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const oldContent = oldMessage.content ? oldMessage.content.substring(0, 900) : "*Sin contenido de texto anterior*";
            const newContent = newMessage.content ? newMessage.content.substring(0, 900) : "*Sin contenido de texto nuevo*";

            const embed = new EmbedBuilder()
                .setTitle("✏️ Mensaje Editado")
                .setColor("#F59E0B")
                .addFields(
                    { name: "Autor", value: `${oldMessage.author} (\`${oldMessage.author.id}\`)`, inline: true },
                    { name: "Canal", value: `${oldMessage.channel} (\`${oldMessage.channel.id}\`)`, inline: true },
                    { name: "Antes", value: oldContent },
                    { name: "Después", value: newContent }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de mensaje editado:", error);
        }
    });

    // 3. Miembro se Une (Registro en Logs)
    client.on("guildMemberAdd", async (member) => {
        try {
            const settings = await db.getSettings(member.guild.id);
            if (!settings.logChannel) return;

            const channel = member.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const createdTime = Math.floor(member.user.createdTimestamp / 1000);

            const embed = new EmbedBuilder()
                .setTitle("📥 Miembro Unido")
                .setColor("#10B981")
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .addFields(
                    { name: "Usuario", value: `${member.user} (\`${member.user.id}\`)`, inline: true },
                    { name: "Etiqueta", value: `\`${member.user.tag}\``, inline: true },
                    { name: "Cuenta Creada", value: `<t:${createdTime}:F> (<t:${createdTime}:R>)`, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de miembro unido:", error);
        }
    });

    // 4. Miembro Sale (Despedida y Registro en Logs)
    client.on("guildMemberRemove", async (member) => {
        try {
            const settings = await db.getSettings(member.guild.id);

            // A) Enviar despedida al canal de bienvenidas/despedidas
            if (settings.welcomeChannel) {
                const welcomeCh = member.guild.channels.cache.get(settings.welcomeChannel);
                if (welcomeCh) {
                    await welcomeCh.send({
                        content: `👋 **${member.user.username}** ha abandonado el servidor. ¡Esperamos volver a verte!`
                    }).catch(() => { });
                }
            }

            // B) Registrar en canal de logs
            if (settings.logChannel) {
                const channel = member.guild.channels.cache.get(settings.logChannel);
                if (channel) {
                    const joinedTime = member.joinedTimestamp
                        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                        : "Desconocido";

                    const embed = new EmbedBuilder()
                        .setTitle("📤 Miembro Salió")
                        .setColor("#EF4444")
                        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                        .addFields(
                            { name: "Usuario", value: `${member.user} (\`${member.user.id}\`)`, inline: true },
                            { name: "Etiqueta", value: `\`${member.user.tag}\``, inline: true },
                            { name: "Se unió al servidor", value: joinedTime, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: "Registro de Actividad" });

                    await channel.send({ embeds: [embed] }).catch(() => { });
                }
            }
        } catch (error) {
            console.error("[!] Error en el logger de miembro salió:", error);
        }
    });

    // 5. Canal Creado
    client.on("channelCreate", async (ch) => {
        if (!ch.guild) return;

        try {
            const settings = await db.getSettings(ch.guild.id);
            if (!settings.logChannel) return;

            const channel = ch.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle("➕ Canal Creado")
                .setColor("#10B981")
                .addFields(
                    { name: "Nombre", value: `${ch} (\`${ch.name}\`)`, inline: true },
                    { name: "Tipo", value: getChannelTypeName(ch.type), inline: true },
                    { name: "Categoría", value: ch.parent ? ch.parent.name : "Ninguna", inline: true }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de canal creado:", error);
        }
    });

    // 6. Canal Eliminado
    client.on("channelDelete", async (ch) => {
        if (!ch.guild) return;

        try {
            const settings = await db.getSettings(ch.guild.id);
            if (!settings.logChannel) return;

            const channel = ch.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle("➖ Canal Eliminado")
                .setColor("#EF4444")
                .addFields(
                    { name: "Nombre", value: `\`${ch.name}\``, inline: true },
                    { name: "Tipo", value: getChannelTypeName(ch.type), inline: true },
                    { name: "Categoría", value: ch.parent ? ch.parent.name : "Ninguna", inline: true }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de canal eliminado:", error);
        }
    });

    // 7. Rol Creado
    client.on("roleCreate", async (role) => {
        try {
            const settings = await db.getSettings(role.guild.id);
            if (!settings.logChannel) return;

            const channel = role.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle("➕ Rol Creado")
                .setColor("#10B981")
                .addFields(
                    { name: "Rol", value: `${role} (\`${role.name}\`)`, inline: true },
                    { name: "ID", value: `\`${role.id}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de rol creado:", error);
        }
    });

    // 8. Rol Eliminado
    client.on("roleDelete", async (role) => {
        try {
            const settings = await db.getSettings(role.guild.id);
            if (!settings.logChannel) return;

            const channel = role.guild.channels.cache.get(settings.logChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle("➖ Rol Eliminado")
                .setColor("#EF4444")
                .addFields(
                    { name: "Nombre", value: `\`${role.name}\``, inline: true },
                    { name: "ID", value: `\`${role.id}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: "Registro de Actividad" });

            await channel.send({ embeds: [embed] }).catch(() => { });
        } catch (error) {
            console.error("[!] Error en el logger de rol eliminado:", error);
        }
    });
}
