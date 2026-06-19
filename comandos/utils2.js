import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import Emojis from "../scr/emojis.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const afkUsers = new Map();
const notesDB = new Map();
const snipedMessages = new Map();
const reminders = new Map();

function loadNotes() {
    const filePath = path.resolve(__dirname, "../secrets/notes.json");
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            for (const [k, v] of Object.entries(data)) notesDB.set(k, v);
        }
    } catch {}
}

function saveNotes() {
    const filePath = path.resolve(__dirname, "../secrets/notes.json");
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(Object.fromEntries(notesDB), null, 2), "utf8");
    } catch {}
}

loadNotes();

export const utils2Commands = [
    {
        name: "afk",
        description: "Ponte AFK (te mencionan y te avisan).",
        category: "general",
        aliases: ["away"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description).addStringOption(o => o.setName("razon").setDescription("Razón de AFK"));
        },
        async executeSlash(interaction) {
            const reason = interaction.options.getString("razon") || "AFK";
            afkUsers.set(interaction.user.id, { reason, since: Date.now(), guild: interaction.guildId });
            await interaction.reply({ content: `💤 **${interaction.user.username}** ahora está AFK: ${reason}`, ephemeral: true });
        },
        async executePrefix(message, args) {
            const reason = args.join(" ") || "AFK";
            afkUsers.set(message.author.id, { reason, since: Date.now(), guild: message.guildId });
            await message.reply(`💤 **${message.author.username}** ahora está AFK: ${reason}`);
        }
    },
    {
        name: "remind",
        description: "Establece un recordatorio.",
        category: "general",
        aliases: ["recordar", "reminder"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addIntegerOption(o => o.setName("minutos").setDescription("Minutos hasta el recordatorio").setRequired(true).setMinValue(1).setMaxValue(10080))
                .addStringOption(o => o.setName("mensaje").setDescription("Qué recordar").setRequired(true));
        },
        async executeSlash(interaction) {
            const mins = interaction.options.getInteger("minutos");
            const msg = interaction.options.getString("mensaje");
            const expires = Date.now() + mins * 60000;
            if (!reminders.has(interaction.guildId)) reminders.set(interaction.guildId, []);
            reminders.get(interaction.guildId).push({ userId: interaction.user.id, msg, expires, channel: interaction.channelId });
            await interaction.reply({ content: `⏰ Te recordaré **"${msg}"** en ${mins} minuto(s).`, ephemeral: true });
            setTimeout(async () => {
                try {
                    const ch = await interaction.client.channels.fetch(interaction.channelId);
                    if (ch) await ch.send(`<@${interaction.user.id}> ⏰ **Recordatorio:** ${msg}`);
                } catch {}
            }, mins * 60000);
        },
        async executePrefix(message, args) {
            const mins = parseInt(args[0]);
            if (!mins || mins < 1 || mins > 10080) return message.reply("❌ Uso: `!remind <minutos> <mensaje>` (max 10080 min = 7 días)");
            const msg = args.slice(1).join(" ");
            if (!msg) return message.reply("❌ Escribe qué quieres que te recuerde.");
            setTimeout(async () => {
                try {
                    await message.channel.send(`<@${message.author.id}> ⏰ **Recordatorio:** ${msg}`);
                } catch {}
            }, mins * 60000);
            await message.reply(`⏰ Te recordaré **"${msg}"** en ${mins} minuto(s).`);
        }
    },
    {
        name: "note",
        description: "Guarda o lista tus notas personales.",
        category: "general",
        aliases: ["nota", "notes"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addSubcommand(sub => sub.setName("add").setDescription("Añadir nota").addStringOption(o => o.setName("texto").setDescription("Texto de la nota").setRequired(true)))
                .addSubcommand(sub => sub.setName("list").setDescription("Ver tus notas"))
                .addSubcommand(sub => sub.setName("delete").setDescription("Eliminar nota").addIntegerOption(o => o.setName("id").setDescription("ID de la nota").setRequired(true)));
        },
        async executeSlash(interaction) {
            const sub = interaction.options.getSubcommand();
            const key = `${interaction.guildId}:${interaction.user.id}`;
            if (sub === "add") {
                const text = interaction.options.getString("texto");
                if (!notesDB.has(key)) notesDB.set(key, []);
                notesDB.get(key).push({ text, created: Date.now() });
                saveNotes();
                await interaction.reply({ content: `📝 Nota guardada (${notesDB.get(key).length} total).`, ephemeral: true });
            } else if (sub === "list") {
                const notes = notesDB.get(key) || [];
                if (!notes.length) return interaction.reply({ content: "📝 No tienes notas.", ephemeral: true });
                const list = notes.map((n, i) => `**${i + 1}.** ${n.text.substring(0, 100)}`).join("\n");
                await interaction.reply({ content: list.substring(0, 2000), ephemeral: true });
            } else if (sub === "delete") {
                const id = interaction.options.getInteger("id");
                const notes = notesDB.get(key) || [];
                if (id < 1 || id > notes.length) return interaction.reply({ content: "❌ ID inválido.", ephemeral: true });
                notes.splice(id - 1, 1);
                saveNotes();
                await interaction.reply({ content: `🗑️ Nota eliminada.`, ephemeral: true });
            }
        },
        async executePrefix(message, args) {
            const sub = args[0]?.toLowerCase();
            const key = `${message.guildId}:${message.author.id}`;
            if (sub === "add" || sub === "nueva") {
                const text = args.slice(1).join(" ");
                if (!text) return message.reply("❌ Uso: `!note add <texto>`");
                if (!notesDB.has(key)) notesDB.set(key, []);
                notesDB.get(key).push({ text, created: Date.now() });
                saveNotes();
                await message.reply(`📝 Nota guardada (${notesDB.get(key).length} total).`);
            } else if (sub === "list" || sub === "ver") {
                const notes = notesDB.get(key) || [];
                if (!notes.length) return message.reply("📝 No tienes notas.");
                const list = notes.map((n, i) => `**${i + 1}.** ${n.text.substring(0, 100)}`).join("\n");
                await message.reply(list.substring(0, 2000));
            } else if (sub === "delete" || sub === "borrar") {
                const id = parseInt(args[1]);
                const notes = notesDB.get(key) || [];
                if (!id || id < 1 || id > notes.length) return message.reply("❌ Uso: `!note delete <id>`");
                notes.splice(id - 1, 1);
                saveNotes();
                await message.reply("🗑️ Nota eliminada.");
            } else {
                await message.reply("📝 Uso: `!note <add|list|delete>`");
            }
        }
    },
    {
        name: "snipe",
        description: "Recupera el último mensaje eliminado en el canal.",
        category: "general",
        aliases: ["recuperar"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const last = snipedMessages.get(interaction.channelId);
            if (!last) return interaction.reply({ content: "❌ No hay mensajes eliminados recientes en este canal.", ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle("👻 Mensaje eliminado")
                .setDescription(last.content || "*Sin contenido*")
                .setAuthor({ name: last.author, iconURL: last.avatar })
                .setColor("#f87171")
                .setFooter({ text: `Eliminado hace ${Math.floor((Date.now() - last.time) / 1000)}s` });
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message) {
            const last = snipedMessages.get(message.channelId);
            if (!last) return message.reply("❌ No hay mensajes eliminados recientes.");
            const embed = new EmbedBuilder()
                .setTitle("👻 Mensaje eliminado")
                .setDescription(last.content || "*Sin contenido*")
                .setAuthor({ name: last.author, iconURL: last.avatar })
                .setColor("#f87171")
                .setFooter({ text: `Eliminado hace ${Math.floor((Date.now() - last.time) / 1000)}s` });
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "uptime",
        description: "Muestra el tiempo que lleva el bot activo.",
        category: "general",
        aliases: ["tiempo"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const s = Math.floor(interaction.client.uptime / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            await interaction.reply(`⏱️ Uptime: **${d}d ${h}h ${m}m ${sec}s**`);
        },
        async executePrefix(message) {
            const s = Math.floor(message.client.uptime / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            await message.reply(`⏱️ Uptime: **${d}d ${h}h ${m}m ${sec}s**`);
        }
    },
    {
        name: "stats",
        description: "Estadísticas del bot.",
        category: "general",
        aliases: ["botinfo", "info"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const c = interaction.client;
            const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
            const embed = new EmbedBuilder()
                .setTitle("📊 Estadísticas del Bot")
                .addFields(
                    { name: "Servidores", value: `${c.guilds.cache.size}`, inline: true },
                    { name: "Usuarios", value: `${c.users.cache.size}`, inline: true },
                    { name: "Canales", value: `${c.channels.cache.size}`, inline: true },
                    { name: "Uptime", value: `<t:${Math.floor((Date.now() - c.uptime) / 1000)}:R>`, inline: true },
                    { name: "Ping", value: `${Math.round(c.ws.ping)}ms`, inline: true },
                    { name: "Memoria", value: `${mem} MB`, inline: true },
                    { name: "Node.js", value: process.version, inline: true },
                    { name: "Discord.js", value: `v${c.options.version || "14"}`, inline: true }
                )
                .setColor("#7c5cff");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message) {
            const c = message.client;
            const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
            const embed = new EmbedBuilder()
                .setTitle("📊 Estadísticas del Bot")
                .addFields(
                    { name: "Servidores", value: `${c.guilds.cache.size}`, inline: true },
                    { name: "Usuarios", value: `${c.users.cache.size}`, inline: true },
                    { name: "Canales", value: `${c.channels.cache.size}`, inline: true },
                    { name: "Ping", value: `${Math.round(c.ws.ping)}ms`, inline: true },
                    { name: "Memoria", value: `${mem} MB`, inline: true },
                    { name: "Node.js", value: process.version, inline: true }
                )
                .setColor("#7c5cff");
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "serverlist",
        description: "Muestra los servidores donde está el bot.",
        category: "general",
        aliases: ["guildlist", "servers"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const guilds = interaction.client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
            const list = guilds.map((g, i) => `**${i + 1}.** ${g.name} — ${g.memberCount} miembros`).join("\n");
            await interaction.reply({ content: list.substring(0, 2000), ephemeral: true });
        },
        async executePrefix(message) {
            const guilds = message.client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
            const list = guilds.map((g, i) => `**${i + 1}.** ${g.name} — ${g.memberCount} miembros`).join("\n");
            await message.reply(list.substring(0, 2000));
        }
    },
    {
        name: "invite",
        description: "Genera un enlace de invitación para el bot.",
        category: "general",
        aliases: ["invitacion"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const link = `https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
            await interaction.reply({ content: `🔗 [Clic aquí para invitar al bot](${link})`, ephemeral: true });
        },
        async executePrefix(message) {
            const link = `https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands`;
            await message.reply(`🔗 [Clic aquí para invitar al bot](${link})`);
        }
    },
];

// Snipe: escuchar mensajes eliminados
export function setupSnipeListener(client) {
    client.on("messageDelete", (msg) => {
        if (msg.author?.bot || !msg.content) return;
        snipedMessages.set(msg.channel.id, {
            content: msg.content,
            author: msg.author.tag,
            avatar: msg.author.displayAvatarURL(),
            time: Date.now()
        });
    });
}
