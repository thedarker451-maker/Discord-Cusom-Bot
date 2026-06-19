import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

function resolveUser(message, arg) {
    if (!arg) return message.author;
    const match = arg.match(/^<@!?(\d+)>$/);
    const id = match ? match[1] : arg;
    return message.client.users.cache.get(id) || message.author;
}

const SLAP_GIFS = [
    "https://media.giphy.com/media/gEo7NyjovTGfC/giphy.gif",
    "https://media.giphy.com/media/ZcU3AYbIOhPmU/giphy.gif",
    "https://media.giphy.com/media/mEtSQjpqWb7mY/giphy.gif"
];

const HUG_GIFS = [
    "https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif",
    "https://media.giphy.com/media/wnsgren9NtIT4/giphy.gif"
];

const CHISTES = [
    "¿Por qué los programadores confunden Halloween y Navidad? Porque OCT 31 == DEC 25.",
    "— ¿Cuántos devs hacen falta para cambiar una bombilla?\n— Ninguno, es un problema de hardware.",
    "Mi código no funciona, tengo un feeling... y se llama 'bug'.",
    "El bot no está roto, solo está en modo 'feature sorpresa'.",
    "¿Sabes qué dijo el 8 al 0? ¡Guau, qué cintura!",
    "Un SQL entra a un bar, se acerca a dos tablas y pregunta: ¿puedo unirme?",
    "— Doctor, me duele todo cuando toco algo.\n— ¿Tiene el hombro?\n— ¡Auch! ¿La rodilla?\n— ¡Auch! Pues no te toques nada.",
    "¿Cuál es el colmo de un electricista? Que su hijo se llame Socket.",
    "La IA no va a reemplazarte... hasta que dejes de pagar el hosting.",
    "— ¿Eres full stack?\n— Sí, lleno de bugs en todas las capas."
];

const BALL_ANSWERS = [
    "Sí, definitivamente.", "Es cierto.", "Sin duda.", "Sí.",
    "Puedes confiar en ello.", "Como yo lo veo, sí.",
    "Lo más probable.", "Perspectiva buena.", "Sí.",
    "Respuesta confusa, intenta otra vez.", "Pregunta más tarde.",
    "Mejor no decirte ahora.", "No puedo predecirlo ahora.",
    "Concéntrate y pregunta otra vez.", "No cuentes con ello.",
    "Mi respuesta es no.", "Mis fuentes dicen que no.",
    "Perspectiva no muy buena.", "Muy dudoso."
];

const AJA_REACTIONS = [
    "aja... 🫢", "aja moment 💀", "aja pero literal", "aja, suena sospechoso",
    "aja... no sé Rick, parece falso", "aja, anótalo en el calendario",
    "aja, eso escaló rápido", "aja... interesante plot twist"
];

export const funCommands = [
    {
        name: "slap",
        description: "Abofetea a alguien (de forma divertida).",
        category: "diversión",
        aliases: ["cachetada", "bofetada"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("Víctima").setRequired(true));
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser("usuario");
            const gif = SLAP_GIFS[Math.floor(Math.random() * SLAP_GIFS.length)];
            const embed = new EmbedBuilder()
                .setDescription(`👋 **${interaction.user.username}** abofeteó a **${target.username}**!`)
                .setImage(gif)
                .setColor("#FF6B6B");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const target = resolveUser(message, args[0]);
            const gif = SLAP_GIFS[Math.floor(Math.random() * SLAP_GIFS.length)];
            await message.reply({ embeds: [new EmbedBuilder().setDescription(`👋 **${message.author.username}** abofeteó a **${target.username}**!`).setImage(gif).setColor("#FF6B6B")] });
        }
    },
    {
        name: "amor",
        description: "Calcula el porcentaje de amor entre dos usuarios.",
        category: "diversión",
        aliases: ["love", "ship"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(o => o.setName("usuario1").setDescription("Primera persona"))
                .addUserOption(o => o.setName("usuario2").setDescription("Segunda persona"));
        },
        async executeSlash(interaction) {
            const u1 = interaction.options.getUser("usuario1") || interaction.user;
            const u2 = interaction.options.getUser("usuario2") || interaction.user;
            const pct = Math.abs([...`${u1.id}${u2.id}`].reduce((a, c) => a + c.charCodeAt(0), 0)) % 101;
            const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
            const embed = new EmbedBuilder()
                .setTitle("💕 Calculadora del Amor")
                .setDescription(`**${u1.username}** + **${u2.username}**\n\n\`${bar}\` **${pct}%**`)
                .setColor(pct > 70 ? "#FF69B4" : pct > 40 ? "#FFB347" : "#6B7280");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const u1 = resolveUser(message, args[0]);
            const u2 = resolveUser(message, args[1]);
            const pct = Math.abs([...`${u1.id}${u2.id}`].reduce((a, c) => a + c.charCodeAt(0), 0)) % 101;
            const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
            await message.reply({ embeds: [new EmbedBuilder().setTitle("💕 Calculadora del Amor").setDescription(`**${u1.username}** + **${u2.username}**\n\n\`${bar}\` **${pct}%**`).setColor("#FF69B4")] });
        }
    },
    {
        name: "homo",
        description: "Calcula el porcentaje de compatibilidad homo entre dos usuarios.",
        category: "diversión",
        aliases: [],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(o => o.setName("usuario1"))
                .addUserOption(o => o.setName("usuario2"));
        },
        async executeSlash(interaction) {
            const u1 = interaction.options.getUser("usuario1") || interaction.user;
            const u2 = interaction.options.getUser("usuario2") || interaction.user;
            const pct = (parseInt(u1.id.slice(-4), 10) + parseInt(u2.id.slice(-4), 10)) % 101;
            await interaction.reply(`🏳️‍🌈 **${u1.username}** × **${u2.username}** → **${pct}%** de vibra rainbow`);
        },
        async executePrefix(message, args) {
            const u1 = resolveUser(message, args[0]);
            const u2 = resolveUser(message, args[1]);
            const pct = (parseInt(u1.id.slice(-4), 10) + parseInt(u2.id.slice(-4), 10)) % 101;
            await message.reply(`🏳️‍🌈 **${u1.username}** × **${u2.username}** → **${pct}%** de vibra rainbow`);
        }
    },
    {
        name: "8ball",
        description: "Pregúntale a la bola 8 mágica.",
        category: "diversión",
        aliases: ["8b", "bola8"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("pregunta").setDescription("Tu pregunta").setRequired(true));
        },
        async executeSlash(interaction) {
            const q = interaction.options.getString("pregunta");
            const ans = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("🎱 Bola 8 Mágica").addFields({ name: "Pregunta", value: q }, { name: "Respuesta", value: ans }).setColor("#1a1a2e")] });
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Escribe una pregunta. Ej: `!8ball ¿Lloverá hoy?`");
            const ans = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];
            await message.reply({ embeds: [new EmbedBuilder().setTitle("🎱 Bola 8 Mágica").addFields({ name: "Pregunta", value: args.join(" ") }, { name: "Respuesta", value: ans }).setColor("#1a1a2e")] });
        }
    },
    {
        name: "aquinator",
        description: "El Aquinator responde sí o no a tu dilema.",
        category: "diversión",
        aliases: ["aqui", "siono"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("dilema").setDescription("Tu dilema").setRequired(true));
        },
        async executeSlash(interaction) {
            const dilema = interaction.options.getString("dilema");
            const respuestas = ["Sí.", "No.", "Absolutamente sí.", "Ni loco.", "Tal vez... pero no.", "El universo dice que sí.", "Pregúntale a tu mamá.", "100% confirmado.", "Negativo, compa."];
            const r = respuestas[Math.floor(Math.random() * respuestas.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("🦈 Aquinator").setDescription(`**Dilema:** ${dilema}\n\n**Veredicto:** ${r}`).setColor("#00CED1").setFooter({ text: "El Aquinator ha hablado" })] });
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Dime tu dilema. Ej: `!aquinator ¿Pizza o hamburguesa?`");
            const respuestas = ["Sí.", "No.", "Absolutamente sí.", "Ni loco.", "El universo dice que sí."];
            const r = respuestas[Math.floor(Math.random() * respuestas.length)];
            await message.reply({ embeds: [new EmbedBuilder().setTitle("🦈 Aquinator").setDescription(`**Dilema:** ${args.join(" ")}\n\n**Veredicto:** ${r}`).setColor("#00CED1")] });
        }
    },
    {
        name: "chiste",
        description: "Cuenta un chiste aleatorio.",
        category: "diversión",
        aliases: ["joke", "chistes"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const chiste = CHISTES[Math.floor(Math.random() * CHISTES.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${Emojis.newspaper} Chiste del día`).setDescription(chiste).setColor("#F59E0B")] });
        },
        async executePrefix(message) {
            const chiste = CHISTES[Math.floor(Math.random() * CHISTES.length)];
            await message.reply({ embeds: [new EmbedBuilder().setTitle(`${Emojis.newspaper} Chiste del día`).setDescription(chiste).setColor("#F59E0B")] });
        }
    },
    {
        name: "aja",
        description: "Reacción 'aja' aleatoria.",
        category: "diversión",
        aliases: [],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            await interaction.reply(AJA_REACTIONS[Math.floor(Math.random() * AJA_REACTIONS.length)]);
        },
        async executePrefix(message) {
            await message.reply(AJA_REACTIONS[Math.floor(Math.random() * AJA_REACTIONS.length)]);
        }
    },
    {
        name: "hug",
        description: "Abraza a alguien.",
        category: "diversión",
        aliases: ["abrazo"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("A quién abrazar"));
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser("usuario") || interaction.user;
            const gif = HUG_GIFS[Math.floor(Math.random() * HUG_GIFS.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`🤗 **${interaction.user.username}** abraza a **${target.username}**!`).setImage(gif).setColor("#A855F7")] });
        },
        async executePrefix(message, args) {
            const target = resolveUser(message, args[0]);
            const gif = HUG_GIFS[Math.floor(Math.random() * HUG_GIFS.length)];
            await message.reply({ embeds: [new EmbedBuilder().setDescription(`🤗 **${message.author.username}** abraza a **${target.username}**!`).setImage(gif).setColor("#A855F7")] });
        }
    },
    {
        name: "rate",
        description: "Califica algo del 0 al 100.",
        category: "diversión",
        aliases: ["calificar"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("cosa").setDescription("Qué calificar").setRequired(true));
        },
        async executeSlash(interaction) {
            const cosa = interaction.options.getString("cosa");
            const score = Math.floor(Math.random() * 101);
            await interaction.reply(`⭐ Califico **${cosa}** con un **${score}/100**`);
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Especifica qué calificar.");
            const score = Math.floor(Math.random() * 101);
            await message.reply(`⭐ Califico **${args.join(" ")}** con un **${score}/100**`);
        }
    },
    {
        name: "coinflip",
        description: "Lanza una moneda.",
        category: "diversión",
        aliases: ["moneda", "flip"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const result = Math.random() < 0.5 ? "Cara 🪙" : "Cruz 🔄";
            await interaction.reply(`🎲 La moneda cayó en: **${result}**`);
        },
        async executePrefix(message) {
            const result = Math.random() < 0.5 ? "Cara 🪙" : "Cruz 🔄";
            await message.reply(`🎲 La moneda cayó en: **${result}**`);
        }
    },
    {
        name: "dado",
        description: "Tira un dado de 6 caras.",
        category: "diversión",
        aliases: ["dice", "roll"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(o => o.setName("caras").setDescription("Número de caras (default 6)").setMinValue(2).setMaxValue(100));
        },
        async executeSlash(interaction) {
            const faces = interaction.options.getInteger("caras") || 6;
            const roll = Math.floor(Math.random() * faces) + 1;
            await interaction.reply(`🎲 Tiraste un **${roll}** (d${faces})`);
        },
        async executePrefix(message, args) {
            const faces = parseInt(args[0]) || 6;
            const roll = Math.floor(Math.random() * faces) + 1;
            await message.reply(`🎲 Tiraste un **${roll}** (d${faces})`);
        }
    },
    {
        name: "elegir",
        description: "Elige una opción al azar entre varias.",
        category: "diversión",
        aliases: ["choose", "pick"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("opciones").setDescription("Opciones separadas por coma").setRequired(true));
        },
        async executeSlash(interaction) {
            const opts = interaction.options.getString("opciones").split(",").map(s => s.trim()).filter(Boolean);
            if (opts.length < 2) return interaction.reply({ content: "❌ Necesitas al menos 2 opciones separadas por coma.", ephemeral: true });
            const pick = opts[Math.floor(Math.random() * opts.length)];
            await interaction.reply(`🎯 Elijo: **${pick}**`);
        },
        async executePrefix(message, args) {
            const opts = args.join(" ").split(",").map(s => s.trim()).filter(Boolean);
            if (opts.length < 2) return message.reply("❌ Separa opciones con coma. Ej: `!elegir pizza, hamburguesa, sushi`");
            const pick = opts[Math.floor(Math.random() * opts.length)];
            await message.reply(`🎯 Elijo: **${pick}**`);
        }
    },
    {
        name: "reverse",
        description: "Invierte un texto.",
        category: "diversión",
        aliases: ["invertir", "alreves"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("texto").setDescription("Texto a invertir").setRequired(true));
        },
        async executeSlash(interaction) {
            const t = interaction.options.getString("texto");
            await interaction.reply(`🔁 \`${[...t].reverse().join("")}\``);
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Escribe un texto.");
            const t = args.join(" ");
            await message.reply(`🔁 \`${[...t].reverse().join("")}\``);
        }
    }
];
