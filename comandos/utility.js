import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Emojis from "../scr/emojis.js";
import { allCommands } from "../scr/command-loader.js";
import { buildHelpEmbed } from "../scr/help-builder.js";

function resolveMember(message, arg) {
    if (!arg) return message.member;
    const matches = arg.match(/^<@!?(\d+)>$/);
    return message.guild.members.cache.get(matches ? matches[1] : arg) || message.member;
}

export const utilityCommands = [
    {
        name: "userinfo",
        description: "Muestra información de un usuario del servidor.",
        category: "general",
        aliases: ["user", "usuario"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Usuario").setRequired(false));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: "❌ No encontrado.", ephemeral: true });
            
            const roles = member.roles.cache.filter(r => r.name !== "@everyone").map(r => r.toString()).join(", ") || "Ninguno";
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Información de ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL({ size: 512 }))
                .setColor("#5865F2")
                .addFields(
                    { name: `${Emojis.info} Usuario`, value: `\`${user.username}\``, inline: true },
                    { name: `🆔 ID`, value: `\`${user.id}\``, inline: true },
                    { name: `📅 Creado el`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: `📥 Unido el`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                    { name: `🎭 Roles`, value: roles }
                )
                .setFooter({ text: `Consultado por ${interaction.user.tag}` });
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const member = resolveMember(message, args[0]);
            const user = member.user;
            const roles = member.roles.cache.filter(r => r.name !== "@everyone").map(r => r.toString()).join(", ") || "Ninguno";
            
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Información de ${user.tag}`, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL({ size: 512 }))
                .setColor("#5865F2")
                .addFields(
                    { name: `${Emojis.info} Usuario`, value: `\`${user.username}\``, inline: true },
                    { name: `🆔 ID`, value: `\`${user.id}\``, inline: true },
                    { name: `📅 Creado el`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: `📥 Unido el`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                    { name: `🎭 Roles`, value: roles }
                )
                .setFooter({ text: `Consultado por ${message.author.tag}` });
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "serverinfo",
        description: "Muestra información del servidor.",
        category: "general",
        aliases: ["server", "servidor"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const { guild } = interaction;
            const owner = await guild.fetchOwner();
            const channels = guild.channels.cache;
            
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.serverguide} Información de ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 512 }))
                .setColor("#5865F2")
                .addFields(
                    { name: "🆔 ID", value: `\`${guild.id}\``, inline: true },
                    { name: "👑 Propietario", value: `${owner}`, inline: true },
                    { name: "📅 Creado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: "👥 Miembros", value: `\`${guild.memberCount}\``, inline: true },
                    { name: "🎭 Roles", value: `\`${guild.roles.cache.size}\``, inline: true },
                    { name: "💬 Canales", value: `Txt: \`${channels.filter(c => c.type === 0).size}\` | Voz: \`${channels.filter(c => c.type === 2).size}\``, inline: false }
                );
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const { guild } = message;
            const owner = await guild.fetchOwner();
            const channels = guild.channels.cache;
            
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.serverguide} Información de ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 512 }))
                .setColor("#5865F2")
                .addFields(
                    { name: "🆔 ID", value: `\`${guild.id}\``, inline: true },
                    { name: "👑 Propietario", value: `${owner}`, inline: true },
                    { name: "📅 Creado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: "👥 Miembros", value: `\`${guild.memberCount}\``, inline: true },
                    { name: "🎭 Roles", value: `\`${guild.roles.cache.size}\``, inline: true },
                    { name: "💬 Canales", value: `Txt: \`${channels.filter(c => c.type === 0).size}\` | Voz: \`${channels.filter(c => c.type === 2).size}\``, inline: false }
                );
            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "avatar",
        description: "Muestra el avatar ampliado del usuario.",
        category: "general",
        aliases: ["foto"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Usuario").setRequired(false));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatar de ${user.tag}`).setImage(user.displayAvatarURL({ size: 1024, dynamic: true })).setColor("#5865F2")] });
        },
        async executePrefix(message, args) {
            const member = resolveMember(message, args[0]);
            await message.reply({ embeds: [new EmbedBuilder().setTitle(`🖼️ Avatar de ${member.user.tag}`).setImage(member.user.displayAvatarURL({ size: 1024, dynamic: true })).setColor("#5865F2")] });
        }
    },
    {
        name: "help",
        description: "Muestra el panel de ayuda con categorías del bot.",
        category: "general",
        aliases: ["ayuda"],
        slashBuilder() { 
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description); 
        },
        async executeSlash(interaction) { 
            const prefix = (process.env.PREFIX || "!").split(",")[0].trim();
            const embed = buildHelpEmbed(allCommands, { prefix, requester: interaction.user.tag });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("GitHub").setEmoji({ id: "1513285174950105278" }).setUrl("https://github.com/thedarker451-maker/Discord-Custom-Bot"),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Discord").setEmoji({ id: "1513286948649697424" }).setUrl("https://discord.gg/xAsDHMwjw7")
            );

            await interaction.reply({ embeds: [embed], components: [row] }); 
        },
        async executePrefix(message, args) { 
            const prefix = (process.env.PREFIX || "!").split(",")[0].trim();
            const embed = buildHelpEmbed(allCommands, { prefix, requester: message.author.tag });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("GitHub").setEmoji({ id: "1513285174950105278" }).setUrl("https://github.com/thedarker451-maker/Discord-Custom-Bot"),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Discord").setEmoji({ id: "1513286948649697424" }).setUrl("https://discord.gg/xAsDHMwjw7")
            );

            await message.reply({ embeds: [embed], components: [row] }); 
        }
    }
];
