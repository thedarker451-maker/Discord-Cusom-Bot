import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

export const anunceCommand = [
    {
        name: "anunce",
        description: "Envia un anuncio al canal mas usado",
        category: "moderacion",
        aliases: [],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.checkVerify} anunce`)
                .setDescription("Envia un anuncio al canal mas usado")
                .setColor("#7c5cff")
                .setFooter({ text: `Custom Discord Bot · ${interaction.user.tag}` });
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.checkVerify} anunce`)
                .setDescription("Envia un anuncio al canal mas usado")
                .setColor("#7c5cff")
                .setFooter({ text: `Custom Discord Bot · ${message.author.tag}` });
            await message.reply({ embeds: [embed] });
        }
    }
];
