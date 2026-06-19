import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

export const infoCommands = [
    {
        name: "github",
        description: "Muestra información de un usuario o repositorio de GitHub.",
        category: "general",
        aliases: ["gh", "git"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addStringOption(o => o.setName("query").setDescription("Usuario o usuario/repo").setRequired(true));
        },
        async executeSlash(interaction) {
            const q = interaction.options.getString("query");
            await interaction.deferReply();
            try {
                if (q.includes("/")) {
                    const [owner, repo] = q.split("/");
                    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
                    if (!r.ok) return interaction.editReply("❌ Repositorio no encontrado.");
                    const d = await r.json();
                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.github} ${d.full_name}`)
                        .setURL(d.html_url)
                        .setDescription(d.description || "Sin descripción")
                        .addFields(
                            { name: "⭐ Stars", value: `${d.stargazers_count}`, inline: true },
                            { name: "🍴 Forks", value: `${d.forks_count}`, inline: true },
                            { name: "📋 Issues", value: `${d.open_issues_count}`, inline: true },
                            { name: "Lenguaje", value: d.language || "N/A", inline: true },
                            { name: "Licencia", value: d.license?.name || "N/A", inline: true },
                            { name: "Creado", value: `<t:${Math.floor(new Date(d.created_at) / 1000)}:R>`, inline: true }
                        )
                        .setColor("#333");
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    const r = await fetch(`https://api.github.com/users/${q}`);
                    if (!r.ok) return interaction.editReply("❌ Usuario no encontrado.");
                    const d = await r.json();
                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.github} ${d.login}`)
                        .setURL(d.html_url)
                        .setThumbnail(d.avatar_url)
                        .addFields(
                            { name: "Nombre", value: d.name || "N/A", inline: true },
                            { name: "Bio", value: d.bio || "N/A", inline: true },
                            { name: "Repos", value: `${d.public_repos}`, inline: true },
                            { name: "Seguidores", value: `${d.followers}`, inline: true },
                            { name: "Siguiendo", value: `${d.following}`, inline: true },
                            { name: "Ubicación", value: d.location || "N/A", inline: true }
                        )
                        .setColor("#333");
                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (e) {
                await interaction.editReply(`❌ Error: ${e.message}`);
            }
        },
        async executePrefix(message, args) {
            const q = args.join(" ");
            if (!q) return message.reply("❌ Uso: `!github <usuario>` o `!github <usuario/repo>`");
            try {
                if (q.includes("/")) {
                    const [owner, repo] = q.split("/");
                    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
                    if (!r.ok) return message.reply("❌ Repositorio no encontrado.");
                    const d = await r.json();
                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.github} ${d.full_name}`)
                        .setURL(d.html_url)
                        .setDescription(d.description || "Sin descripción")
                        .addFields(
                            { name: "⭐ Stars", value: `${d.stargazers_count}`, inline: true },
                            { name: "🍴 Forks", value: `${d.forks_count}`, inline: true },
                            { name: "Lenguaje", value: d.language || "N/A", inline: true }
                        )
                        .setColor("#333");
                    await message.reply({ embeds: [embed] });
                } else {
                    const r = await fetch(`https://api.github.com/users/${q}`);
                    if (!r.ok) return message.reply("❌ Usuario no encontrado.");
                    const d = await r.json();
                    const embed = new EmbedBuilder()
                        .setTitle(`${Emojis.github} ${d.login}`)
                        .setURL(d.html_url)
                        .setThumbnail(d.avatar_url)
                        .addFields(
                            { name: "Repos", value: `${d.public_repos}`, inline: true },
                            { name: "Seguidores", value: `${d.followers}`, inline: true },
                            { name: "Ubicación", value: d.location || "N/A", inline: true }
                        )
                        .setColor("#333");
                    await message.reply({ embeds: [embed] });
                }
            } catch (e) {
                message.reply(`❌ Error: ${e.message}`);
            }
        }
    },
    {
        name: "whois",
        description: "Información detallada de un usuario.",
        category: "general",
        aliases: ["userinfo2", "ui"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("Usuario a investigar"));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const embed = new EmbedBuilder()
                .setTitle(`🔍 ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: "ID", value: user.id, inline: true },
                    { name: "Cuenta creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: "Bot", value: user.bot ? "Sí" : "No", inline: true }
                )
                .setColor(user.hexColor || "#7c5cff");
            if (member) {
                embed.addFields(
                    { name: "Se unió", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: "Roles", value: member.roles.cache.filter(r => r.id !== interaction.guildId).map(r => r.toString()).join(", ").substring(0, 1024) || "Ninguno", inline: false },
                    { name: "Color", value: member.displayHexColor || "N/A", inline: true }
                );
            }
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const user = args[0] ? message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null) : message.author;
            if (!user) return message.reply("❌ Usuario no encontrado.");
            const member = message.guild ? await message.guild.members.fetch(user.id).catch(() => null) : null;
            const embed = new EmbedBuilder()
                .setTitle(`🔍 ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: "ID", value: user.id, inline: true },
                    { name: "Cuenta creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setColor(user.hexColor || "#7c5cff");
            if (member) {
                embed.addFields(
                    { name: "Se unió", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: "Roles", value: member.roles.cache.filter(r => r.id !== message.guildId).map(r => r.toString()).join(", ").substring(0, 1024) || "Ninguno", inline: false }
                );
            }
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "banner",
        description: "Muestra el banner de un usuario.",
        category: "general",
        aliases: [],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("Usuario"));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const fetched = await interaction.client.users.fetch(user.id, { force: true });
            if (!fetched.bannerURL()) return interaction.reply({ content: "❌ Este usuario no tiene banner.", ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle(`🎨 Banner de ${user.tag}`)
                .setImage(fetched.bannerURL({ size: 1024 }))
                .setColor("#7c5cff");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const user = args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : message.author;
            if (!user) return message.reply("❌ Usuario no encontrado.");
            const fetched = await message.client.users.fetch(user.id, { force: true });
            if (!fetched.bannerURL()) return message.reply("❌ Este usuario no tiene banner.");
            const embed = new EmbedBuilder()
                .setTitle(`🎨 Banner de ${user.tag}`)
                .setImage(fetched.bannerURL({ size: 1024 }))
                .setColor("#7c5cff");
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "icon",
        description: "Muestra el icono del servidor.",
        category: "general",
        aliases: ["servericon"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const icon = interaction.guild.iconURL({ size: 1024 });
            if (!icon) return interaction.reply({ content: "❌ Este servidor no tiene icono.", ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Icono de ${interaction.guild.name}`)
                .setImage(icon)
                .setColor("#7c5cff");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message) {
            const icon = message.guild?.iconURL({ size: 1024 });
            if (!icon) return message.reply("❌ Este servidor no tiene icono.");
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Icono de ${message.guild.name}`)
                .setImage(icon)
                .setColor("#7c5cff");
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "avatar2",
        description: "Muestra el avatar de un usuario en alta resolución.",
        category: "general",
        aliases: ["foto2"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("Usuario"));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${user.tag}`)
                .setImage(user.displayAvatarURL({ size: 1024, extension: "png" }))
                .setColor(user.hexColor || "#7c5cff");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const user = args[0] ? message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null) : message.author;
            if (!user) return message.reply("❌ Usuario no encontrado.");
            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Avatar de ${user.tag}`)
                .setImage(user.displayAvatarURL({ size: 1024, extension: "png" }))
                .setColor(user.hexColor || "#7c5cff");
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "bug",
        description: "Reporta un bug del bot.",
        category: "general",
        aliases: ["reportar", "report"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addStringOption(o => o.setName("descripcion").setDescription("Describe el bug").setRequired(true));
        },
        async executeSlash(interaction) {
            const desc = interaction.options.getString("descripcion");
            const embed = new EmbedBuilder()
                .setTitle("🐛 Bug Report")
                .setDescription(desc)
                .addFields(
                    { name: "Reporter", value: interaction.user.tag, inline: true },
                    { name: "Servidor", value: interaction.guild?.name || "DM", inline: true },
                    { name: "Canal", value: interaction.channel?.name || "N/A", inline: true }
                )
                .setColor("#f87171")
                .setTimestamp();
            await interaction.reply({ content: "✅ Bug reportado. ¡Gracias!", ephemeral: true });
            console.log(`[BUG REPORT] ${interaction.user.tag}: ${desc}`);
        },
        async executePrefix(message, args) {
            const desc = args.join(" ");
            if (!desc) return message.reply("❌ Describe el bug. Uso: `!bug <descripción>`");
            console.log(`[BUG REPORT] ${message.author.tag}: ${desc}`);
            await message.reply("✅ Bug reportado. ¡Gracias!");
        }
    },
    {
        name: "suggest",
        description: "Envía una sugerencia para el bot.",
        category: "general",
        aliases: ["sugerencia"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addStringOption(o => o.setName("idea").setDescription("Tu sugerencia").setRequired(true));
        },
        async executeSlash(interaction) {
            const idea = interaction.options.getString("idea");
            const embed = new EmbedBuilder()
                .setTitle("💡 Sugerencia")
                .setDescription(idea)
                .addFields({ name: "De", value: interaction.user.tag })
                .setColor("#4fd1c5")
                .setTimestamp();
            await interaction.reply({ content: "✅ Sugerencia enviada. ¡Gracias!", ephemeral: true });
            console.log(`[SUGGESTION] ${interaction.user.tag}: ${idea}`);
        },
        async executePrefix(message, args) {
            const idea = args.join(" ");
            if (!idea) return message.reply("❌ Escribe tu sugerencia. Uso: `!suggest <idea>`");
            console.log(`[SUGGESTION] ${message.author.tag}: ${idea}`);
            await message.reply("✅ Sugerencia enviada. ¡Gracias!");
        }
    },
];
