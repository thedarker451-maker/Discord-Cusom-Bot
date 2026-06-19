import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Emojis from "../scr/emojis.js";

// Cola de música en memoria por servidor
const guildsQueue = new Map();

function getOrCreateQueue(guildId) {
    if (!guildsQueue.has(guildId)) {
        guildsQueue.set(guildId, {
            songs: [],
            playing: false,
            volume: 50,
            paused: false,
            voiceChannel: null
        });
    }
    return guildsQueue.get(guildId);
}

export const musicCommands = [
    {
        name: "play",
        description: "Reproduce una canción en el canal de voz o la añade a la cola.",
        category: "musica",
        aliases: ["p"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt.setName("cancion").setDescription("Nombre o URL de la canción").setRequired(true));
        },
        async executeSlash(interaction) {
            const member = interaction.member;
            if (!member.voice.channel) {
                return interaction.reply({ content: `❌ Debes estar en un canal de voz para usar este comando.`, ephemeral: true });
            }

            const query = interaction.options.getString("cancion");
            const queue = getOrCreateQueue(interaction.guild.id);
            
            const song = {
                title: query.startsWith("http") ? "Enlace de Audio Directo" : query,
                url: query.startsWith("http") ? query : "https://youtube.com/watch?v=dQw4w9WgXcQ",
                duration: "3:45",
                requestedBy: interaction.user.tag
            };

            queue.songs.push(song);
            queue.voiceChannel = member.voice.channel.name;

            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.music} Añadido a la cola`)
                .setDescription(`[${song.title}](${song.url})`)
                .addFields(
                    { name: "Duración", value: song.duration, inline: true },
                    { name: "Solicitado por", value: song.requestedBy, inline: true },
                    { name: "Posición", value: `${queue.songs.length}`, inline: true }
                )
                .setColor("#7F00FF")
                .setThumbnail("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");

            // Si no está reproduciendo, iniciar simulación
            if (!queue.playing) {
                queue.playing = true;
                await interaction.reply({ content: `🎵 Conectándose a **${member.voice.channel.name}**...`, embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed] });
            }
        },
        async executePrefix(message, args) {
            const member = message.member;
            if (!member.voice.channel) return message.reply("❌ Debes estar en un canal de voz.");

            const query = args.join(" ");
            if (!query) return message.reply("❌ Especifica una canción o URL.");

            const queue = getOrCreateQueue(message.guild.id);
            const song = {
                title: query,
                url: "https://youtube.com",
                duration: "4:20",
                requestedBy: message.author.tag
            };

            queue.songs.push(song);
            await message.reply(`${Emojis.music} Añadido a la cola: **${song.title}** (Duración: ${song.duration})`);
        }
    },
    {
        name: "skip",
        description: "Salta la canción actual.",
        category: "musica",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const queue = getOrCreateQueue(interaction.guild.id);
            if (queue.songs.length === 0) {
                return interaction.reply({ content: "❌ No hay canciones en la cola.", ephemeral: true });
            }

            const skipped = queue.songs.shift();
            const next = queue.songs[0];

            if (next) {
                await interaction.reply({ content: `⏭️ Saltado **${skipped.title}**. Reproduciendo ahora: **${next.title}**` });
            } else {
                queue.playing = false;
                await interaction.reply({ content: `⏭️ Saltado **${skipped.title}**. No hay más canciones en la cola.` });
            }
        },
        async executePrefix(message, args) {
            const queue = getOrCreateQueue(message.guild.id);
            if (queue.songs.length === 0) return message.reply("❌ La cola está vacía.");

            const skipped = queue.songs.shift();
            await message.reply(`⏭️ Saltado: **${skipped.title}**.`);
        }
    },
    {
        name: "queue",
        description: "Muestra la cola de canciones actuales.",
        category: "musica",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const queue = getOrCreateQueue(interaction.guild.id);
            if (queue.songs.length === 0) {
                return interaction.reply({ content: "❌ No hay música reproduciéndose en este servidor.", ephemeral: true });
            }

            const list = queue.songs.map((song, i) => `${i === 0 ? "▶️" : `${i}.`} **${song.title}** | \`${song.duration}\` (por ${song.requestedBy})`).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.youtube} Cola de Reproducción`)
                .setDescription(list)
                .setColor("#7F00FF")
                .setFooter({ text: `Canal de Voz: ${queue.voiceChannel}` });

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const queue = getOrCreateQueue(message.guild.id);
            if (queue.songs.length === 0) return message.reply("❌ Cola vacía.");

            const list = queue.songs.map((song, i) => `${i === 0 ? "▶️" : `${i}.`} ${song.title}`).join("\n");
            await message.reply(`🎶 **Cola de Música:**\n${list}`);
        }
    },
    {
        name: "pause",
        description: "Pausa la reproducción de música.",
        category: "musica",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const queue = getOrCreateQueue(interaction.guild.id);
            if (!queue.playing) return interaction.reply({ content: "❌ No hay reproducción activa.", ephemeral: true });

            queue.paused = true;
            await interaction.reply({ content: `⏸️ Reproducción pausada. Usa \`/resume\` para continuar.` });
        },
        async executePrefix(message, args) {
            const queue = getOrCreateQueue(message.guild.id);
            queue.paused = true;
            await message.reply("⏸️ Pausado.");
        }
    },
    {
        name: "resume",
        description: "Reanuda la música pausada.",
        category: "musica",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const queue = getOrCreateQueue(interaction.guild.id);
            if (!queue.paused) return interaction.reply({ content: "❌ La reproducción no está pausada.", ephemeral: true });

            queue.paused = false;
            await interaction.reply({ content: `▶️ Reproducción reanudada.` });
        },
        async executePrefix(message, args) {
            const queue = getOrCreateQueue(message.guild.id);
            queue.paused = false;
            await message.reply("▶️ Reanudado.");
        }
    },
    {
        name: "stop",
        description: "Detiene la música y vacía la cola por completo.",
        category: "musica",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const queue = getOrCreateQueue(interaction.guild.id);
            queue.songs = [];
            queue.playing = false;
            queue.paused = false;

            await interaction.reply({ content: `${Emojis.wecantconect} Se detuvo la música y se limpió la cola.` });
        },
        async executePrefix(message, args) {
            const queue = getOrCreateQueue(message.guild.id);
            queue.songs = [];
            queue.playing = false;
            await message.reply("⏹️ Reproducción detenida.");
        }
    }
];
