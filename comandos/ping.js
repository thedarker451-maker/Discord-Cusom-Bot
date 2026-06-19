import { SlashCommandBuilder, MessageFlags } from "discord.js";
import Emojis from "../scr/emojis.js";

export const pingCommand = [
    {
        name: "ping",
        description: "Calcula y muestra la latencia del bot y de la API de Discord.",
        category: "general",

        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description);
        },

        async executeSlash(interaction) {
            // deferReply evita el timeout de 3s y no necesita fetchReply
            const start = Date.now();
            await interaction.deferReply();
            const latency = Date.now() - start;
            const apiPing = Math.round(interaction.client.ws.ping);

            await interaction.editReply(
                `${Emojis.checkVerify} **¡Pong!**\n` +
                `• **Latencia del Bot:** \`${latency}ms\`\n` +
                `• **Latencia API Discord:** \`${apiPing}ms\``
            );
        },

        async executePrefix(message, args) {
            const start = Date.now();
            const sent = await message.reply(`${Emojis.discord} Midiendo...`);
            const latency = Date.now() - start;
            const apiPing = Math.round(message.client.ws.ping);

            await sent.edit(
                `${Emojis.checkVerify} **¡Pong!**\n` +
                `• **Latencia del Bot:** \`${latency}ms\`\n` +
                `• **Latencia API Discord:** \`${apiPing}ms\``
            );
        }
    }
];
