import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

const TRIVIA_QUESTIONS = [
    { q: "¿Qué lenguaje de programación fue creado por Brendan Eich en 1995?", a: "JavaScript", o: ["Java", "JavaScript", "Python", "C++"] },
    { q: "¿Cuántos bits tiene un byte?", a: "8", o: ["4", "8", "16", "32"] },
    { q: "¿Qué significa HTML?", a: "HyperText Markup Language", o: ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Transfer Markup Language"] },
    { q: "¿En qué año se lanzó GitHub?", a: "2008", o: ["2005", "2006", "2008", "2010"] },
    { q: "¿Qué empresa creó Linux?", a: "Nadie (Linus Torvalds)", o: ["Microsoft", "Google", "Nadie (Linus Torvalds)", "Apple"] },
    { q: "¿Cuál es el framework de JavaScript de Facebook?", a: "React", o: ["Vue", "React", "Angular", "Svelte"] },
    { q: "¿Qué base de datos usa JSON como formato de almacenamiento?", a: "MongoDB", o: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"] },
    { q: "¿Qué significa CSS?", a: "Cascading Style Sheets", o: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Colorful Style Sheets"] },
    { q: "¿En qué año se creó Python?", a: "1991", o: ["1989", "1991", "1995", "2000"] },
    { q: "¿Qué es Docker?", a: "Plataforma de contenedores", o: ["Un lenguaje", "Plataforma de contenedores", "Una base de datos", "Un editor de código"] },
    { q: "¿Cuántos planetas tiene el sistema solar?", a: "8", o: ["7", "8", "9", "10"] },
    { q: "¿Qué animal es el símbolo de Python?", a: "Serpiente", o: ["Serpiente", "Pato", "Mono", "Tigre"] },
    { q: "¿Qué significa API?", a: "Application Programming Interface", o: ["Application Programming Interface", "Advanced Program Integration", "Auto Process Interface", "Applied Programming Input"] },
    { q: "¿Quién es el creador de Linux?", a: "Linus Torvalds", o: ["Bill Gates", "Linus Torvalds", "Mark Zuckerberg", "Elon Musk"] },
    { q: "¿Qué lenguaje se usa para Android nativo?", a: "Kotlin/Java", o: ["Python", "Kotlin/Java", "Swift", "C#"] },
    { q: "¿Cuántos colores tiene el arcoíris?", a: "7", o: ["5", "6", "7", "8"] },
    { q: "¿Qué es un pixel?", a: "Un punto de imagen", o: ["Un archivo", "Un punto de imagen", "Un programa", "Un virus"] },
    { q: "¿Qué empresa hizo famoso al iPhone?", a: "Apple", o: ["Samsung", "Apple", "Google", "Nokia"] },
    { q: "¿Qué lenguaje se usa para estilos web?", a: "CSS", o: ["HTML", "CSS", "JavaScript", "PHP"] },
    { q: "¿Qué es Bitcoin?", a: "Criptomoneda", o: ["Un juego", "Criptomoneda", "Una red social", "Un navegador"] },
];

const FACTS = [
    "Los pulpos tienen 3 corazones y sangre azul.",
    "Las abejas pueden reconocer caras humanas.",
    "Un rayo alcanza los 30,000°C, 5 veces más caliente que el sol.",
    "Los delfines se duermen con un ojo abierto.",
    "El intestino humano mide aproximadamente 9 metros.",
    "Las estrellas no parpadean, es la atmósfera las que las hace parecer que lo hacen.",
    "El cerebro humano usa el 20% de la energía total del cuerpo.",
    "Los gatos no pueden probar el sabor dulce.",
    "La miel nunca caduca, se han encontrado tarros de 3000 años comestibles.",
    "Un copo de nieve siempre tiene 6 puntas.",
    "Los flamencos nacen blancos y se vuelven rosas por su dieta.",
    "El relámpago es 5 veces más caliente que la superficie del sol.",
];

const QUOTES = [
    { text: "El único modo de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
    { text: "La innovación es lo que distingue a un líder de un seguidor.", author: "Steve Jobs" },
    { text: "No importa lo lento que vayas, siempre y cuando no te detengas.", author: "Confucio" },
    { text: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.", author: "Winston Churchill" },
    { text: "La simplicidad es la sofisticación suprema.", author: "Leonardo da Vinci" },
    { text: "El código es como el humor. Cuando tienes que explicarlo, está mal.", author: "Cory House" },
    { text: "Primero resuelve el problema, luego escribe el código.", author: "John Johnson" },
    { text: "La mejor manera de predecir el futuro es crearlo.", author: "Peter Drucker" },
];

const ROASTS = [
    "Tu código tiene más bugs que un estanque. 🐛",
    "Eres como un semáforo en un apocalipsis zombie — inútil pero ahí estás.",
    "Tu IP es 127.0.0.1 pero nadie te conecta. 💀",
    "Eres el `undefined` de la vida.",
    "Ni `try-catch` te salva.",
    "Tu existencia es un `404 Not Found`.",
    "Eres como Internet Explorer — lento y nadie te quiere.",
    "Tu vida es un `while(true)` sin break.",
];

const COMPLIMENTS = [
    "Eres más brillante que un semáforo verde. ✨",
    "Si fueras un lenguaje, serías Python: elegante y versátil.",
    "Tu existencia es un `200 OK`. 💜",
    "Eres el `hello world` perfecto del universo.",
    "Tu código compila a la primera. ¡Eso es raro! 🌟",
    "Eres como un buen commit message: claro y necesario.",
    "Si tu vida fuera un repo, tendría 10k stars. ⭐",
];

const WYR = [
    "¿Poder volar pero solo a 5 km/h o correr a 200 km/h pero solo en línea recta?",
    "¿Solo poder comer pizza el resto de tu vida o nunca más comer pizza?",
    "¿Saber todos los idiomas del mundo o saber tocar todos los instrumentos?",
    "¿Vivir sin WiFi o vivir sin aire acondicionado?",
    "¿Tener super fuerza o super velocidad?",
    "¿Poder leer mentes o poder invisible?",
    "¿Vivir en el pasado o en el futuro?",
    "¿Ser famoso pero odiado o anónimo pero amado?",
];

const MEME_SUBREDDITS = ["programmerhumor", "memes", "dankmemes", "me_irl", "SoftwareGore"];

export const fun2Commands = [
    {
        name: "trivia",
        description: "Juega un trivial de programación y conocimiento.",
        category: "diversión",
        aliases: ["quiz", "triviaquiz"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
            const shuffled = [...q.o].sort(() => Math.random() - 0.5);
            const letters = ["A", "B", "C", "D"];
            const desc = shuffled.map((o, i) => `**${letters[i]}.** ${o}`).join("\n");
            const embed = new EmbedBuilder()
                .setTitle("🧠 Trivia")
                .setDescription(desc)
                .setColor("#7c5cff")
                .setFooter({ text: `Responde con el comando: trivia <letra>` });
            await interaction.reply({ embeds: [embed] });
            const filter = m => m.author.id === interaction.user.id;
            try {
                const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] });
                const ans = collected.first().content.toUpperCase();
                const idx = letters.indexOf(ans);
                if (idx !== -1 && shuffled[idx] === q.a) {
                    await interaction.followUp(`✅ **¡Correcto!** La respuesta es: **${q.a}**`);
                } else {
                    await interaction.followUp(`❌ **Incorrecto.** La respuesta era: **${q.a}**`);
                }
            } catch {
                await interaction.followUp(`⏰ **Tiempo agotado.** La respuesta era: **${q.a}**`);
            }
        },
        async executePrefix(message) {
            const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
            const shuffled = [...q.o].sort(() => Math.random() - 0.5);
            const letters = ["A", "B", "C", "D"];
            const desc = shuffled.map((o, i) => `**${letters[i]}.** ${o}`).join("\n");
            const embed = new EmbedBuilder().setTitle("🧠 Trivia").setDescription(desc).setColor("#7c5cff");
            const msg = await message.reply({ embeds: [embed] });
            const filter = m => m.author.id === message.author.id;
            try {
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] });
                const ans = collected.first().content.toUpperCase();
                const idx = letters.indexOf(ans);
                if (idx !== -1 && shuffled[idx] === q.a) {
                    await message.channel.send(`✅ **¡Correcto!** La respuesta es: **${q.a}**`);
                } else {
                    await message.channel.send(`❌ **Incorrecto.** La respuesta era: **${q.a}**`);
                }
            } catch {
                await message.channel.send(`⏰ **Tiempo agotado.** La respuesta era: **${q.a}**`);
            }
        }
    },
    {
        name: "meme",
        description: "Obtén un meme aleatorio de Reddit.",
        category: "diversión",
        aliases: ["memes"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            await interaction.deferReply();
            try {
                const sub = MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
                const r = await fetch(`https://www.reddit.com/r/${sub}/random.json?limit=1`);
                const data = await r.json();
                const post = data[0]?.data?.children[0]?.data;
                if (!post) return interaction.editReply("No pude encontrar un meme.");
                const embed = new EmbedBuilder()
                    .setTitle(post.title?.substring(0, 256))
                    .setURL(`https://reddit.com${post.permalink}`)
                    .setImage(post.url)
                    .setColor("#FF4500")
                    .setFooter({ text: `👍 ${post.ups} · r/${sub}` });
                await interaction.editReply({ embeds: [embed] });
            } catch {
                await interaction.editReply("Error al obtener meme.");
            }
        },
        async executePrefix(message) {
            try {
                const sub = MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
                const r = await fetch(`https://www.reddit.com/r/${sub}/random.json?limit=1`);
                const data = await r.json();
                const post = data[0]?.data?.children[0]?.data;
                if (!post) return message.reply("No pude encontrar un meme.");
                const embed = new EmbedBuilder()
                    .setTitle(post.title?.substring(0, 256))
                    .setURL(`https://reddit.com${post.permalink}`)
                    .setImage(post.url)
                    .setColor("#FF4500")
                    .setFooter({ text: `👍 ${post.ups} · r/${sub}` });
                await message.reply({ embeds: [embed] });
            } catch {
                message.reply("Error al obtener meme.");
            }
        }
    },
    {
        name: "fact",
        description: "Dato curioso aleatorio.",
        category: "diversión",
        aliases: ["dato", "datocurioso"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const f = FACTS[Math.floor(Math.random() * FACTS.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("💡 Dato curioso").setDescription(f).setColor("#34d399")] });
        },
        async executePrefix(message) {
            const f = FACTS[Math.floor(Math.random() * FACTS.length)];
            await message.reply({ embeds: [new EmbedBuilder().setTitle("💡 Dato curioso").setDescription(f).setColor("#34d399")] });
        }
    },
    {
        name: "quote",
        description: "Cita motivacional aleatoria.",
        category: "diversión",
        aliases: ["frase", "cita"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`*"${q.text}"*\n— **${q.author}**`).setColor("#fbbf24")] });
        },
        async executePrefix(message) {
            const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
            await message.reply({ embeds: [new EmbedBuilder().setDescription(`*"${q.text}"*\n— **${q.author}**`).setColor("#fbbf24")] });
        }
    },
    {
        name: "roast",
        description: "Humilla a alguien (con cariño).",
        category: "diversión",
        aliases: ["humillar", "quemar"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description).addUserOption(o => o.setName("usuario").setDescription("Víctima").setRequired(true));
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser("usuario");
            const r = ROASTS[Math.floor(Math.random() * ROASTS.length)];
            await interaction.reply(`🔥 **${target.username}**, ${r}`);
        },
        async executePrefix(message, args) {
            const target = args[0] ? message.mentions.users.first() : message.author;
            const r = ROASTS[Math.floor(Math.random() * ROASTS.length)];
            await message.reply(`🔥 **${target?.username || message.author.username}**, ${r}`);
        }
    },
    {
        name: "compliment",
        description: "Halaga a alguien.",
        category: "diversión",
        aliases: ["halagar", "cumplido"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description).addUserOption(o => o.setName("usuario").setDescription("Persona"));
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser("usuario") || interaction.user;
            const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
            await interaction.reply(`💜 **${target.username}**, ${c}`);
        },
        async executePrefix(message, args) {
            const target = args[0] ? message.mentions.users.first() : message.author;
            const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
            await message.reply(`💜 **${target?.username || message.author.username}**, ${c}`);
        }
    },
    {
        name: "wyr",
        description: "¿Qué prefieres? - Would You Rather.",
        category: "diversión",
        aliases: ["wouldyou", "queprefieres"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const q = WYR[Math.floor(Math.random() * WYR.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("🤔 ¿Qué prefieres?").setDescription(q).setColor("#7c5cff")] });
        },
        async executePrefix(message) {
            const q = WYR[Math.floor(Math.random() * WYR.length)];
            await message.reply({ embeds: [new EmbedBuilder().setTitle("🤔 ¿Qué prefieres?").setDescription(q).setColor("#7c5cff")] });
        }
    },
    {
        name: "say",
        description: "El bot repite lo que le dices.",
        category: "diversión",
        aliases: ["decir", "repetir"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description).addStringOption(o => o.setName("texto").setDescription("Qué decir").setRequired(true));
        },
        async executeSlash(interaction) {
            const text = interaction.options.getString("texto");
            await interaction.reply({ content: text, allowedMentions: { parse: [] } });
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Escribe algo para que lo diga.");
            await message.channel.send({ content: args.join(" "), allowedMentions: { parse: [] } });
        }
    },
    {
        name: "poll",
        description: "Crea una encuesta con reacciones.",
        category: "diversión",
        aliases: ["encuesta"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addStringOption(o => o.setName("pregunta").setDescription("Pregunta de la encuesta").setRequired(true))
                .addStringOption(o => o.setName("opciones").setDescription("Opciones separadas por coma (max 10)"));
        },
        async executeSlash(interaction) {
            const question = interaction.options.getString("pregunta");
            const optsRaw = interaction.options.getString("opciones");
            const nums = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
            let desc = `**${question}**\n\n`;
            if (optsRaw) {
                const opts = optsRaw.split(",").map(s => s.trim()).slice(0, 10);
                desc += opts.map((o, i) => `${nums[i]} ${o}`).join("\n");
            } else {
                desc += "👍 Sí\n👎 No";
            }
            const msg = await interaction.reply({ embeds: [new EmbedBuilder().setTitle("📊 Encuesta").setDescription(desc).setColor("#7c5cff").setFooter({ text: `Encuesta de ${interaction.user.tag}` })], fetchReply: true });
            if (optsRaw) {
                const opts = optsRaw.split(",").map(s => s.trim()).slice(0, 10);
                for (let i = 0; i < opts.length; i++) await msg.react(nums[i]);
            } else {
                await msg.react("👍");
                await msg.react("👎");
            }
        },
        async executePrefix(message, args) {
            if (!args.length) return message.reply("❌ Escribe una pregunta. Opciones: `!poll Pregunta? op1, op2`");
            const parts = args.join(" ").split("|").map(s => s.trim());
            const question = parts[0];
            const optsRaw = parts[1];
            const nums = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
            let desc = `**${question}**\n\n`;
            if (optsRaw) {
                const opts = optsRaw.split(",").map(s => s.trim()).slice(0, 10);
                desc += opts.map((o, i) => `${nums[i]} ${o}`).join("\n");
            } else {
                desc += "👍 Sí\n👎 No";
            }
            const msg = await message.reply({ embeds: [new EmbedBuilder().setTitle("📊 Encuesta").setDescription(desc).setColor("#7c5cff").setFooter({ text: `Encuesta de ${message.author.tag}` })] });
            if (optsRaw) {
                const opts = optsRaw.split(",").map(s => s.trim()).slice(0, 10);
                for (let i = 0; i < opts.length; i++) await msg.react(nums[i]);
            } else {
                await msg.react("👍");
                await msg.react("👎");
            }
        }
    },
];
