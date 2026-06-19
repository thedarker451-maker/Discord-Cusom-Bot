import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";
import db from "../scr/database.js";

const WORK_JOBS_2 = [
    { name: "Streamer", min: 50, max: 300, reqLevel: 0, emoji: "📺" },
    { name: "Diseñador", min: 80, max: 400, reqLevel: 2, emoji: "🎨" },
    { name: "Hacker", min: 100, max: 500, reqLevel: 5, emoji: "💻" },
    { name: "Chef", min: 60, max: 350, reqLevel: 0, emoji: "👨‍🍳" },
    { name: "Piloto", min: 200, max: 800, reqLevel: 8, emoji: "✈️" },
    { name: "Médico", min: 250, max: 900, reqLevel: 10, emoji: "🏥" },
    { name: "Abogado", min: 180, max: 700, reqLevel: 7, emoji: "⚖️" },
    { name: "Ingeniero", min: 150, max: 650, reqLevel: 5, emoji: "🔧" },
];

const TRIVIA_ECONOMY = [
    { q: "¿Qué moneda se usa en Japón?", a: "Yen", o: ["Yen", "Won", "Yuan", "Dólar"] },
    { q: "¿Cuántos céntimos hay en un dólar?", a: "100", o: ["10", "50", "100", "1000"] },
    { q: "¿Qué país tiene la mayor economía del mundo (nominal)?", a: "Estados Unidos", o: ["China", "Estados Unidos", "Japón", "Alemania"] },
    { q: "¿Qué es el PIB?", a: "Producto Interno Bruto", o: ["Producto Interno Bruto", "Pago Interno Bancario", "Plan de Inversiones Base", "Promedio de Ingresos Brutoss"] },
    { q: "¿Qué criptomoneda fue la primera?", a: "Bitcoin", o: ["Ethereum", "Bitcoin", "Litecoin", "Dogecoin"] },
    { q: "¿Qué significa 'IPO'?", a: "Oferta Pública Inicial", o: ["Oferta Pública Inicial", "Interés Público Oficial", "Ingreso de Pagos Online", "Inversión Privada Original"] },
    { q: "¿En qué bolsa cotiza Apple principalmete?", a: "NASDAQ", o: ["NYSE", "NASDAQ", "LSE", "JPX"] },
    { q: "¿Qué metal precioso es el más caro por gramo?", a: "Rodio", o: ["Oro", "Plata", "Rodio", "Platino"] },
];

const LOTTERY_PRICES = { "1ticket": 100, "3tickets": 250, "5tickets": 400 };

export const economy2Commands = [
    {
        name: "rob",
        description: "Intenta robarle NC a otro usuario.",
        category: "economia",
        aliases: ["robar"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addUserOption(o => o.setName("usuario").setDescription("A quién robar").setRequired(true));
        },
        async executeSlash(interaction) {
            const target = interaction.options.getUser("usuario");
            if (target.id === interaction.user.id) return interaction.reply({ content: "❌ No puedes robarte a ti mismo.", ephemeral: true });
            if (target.bot) return interaction.reply({ content: "❌ No puedes robarle a un bot.", ephemeral: true });

            const myEco = await db.getUserEconomy(interaction.user.id);
            const targetEco = await db.getUserEconomy(target.id);

            if (Date.now() - (myEco.lastRob || 0) < 60000) {
                const wait = Math.ceil((60000 - (Date.now() - myEco.lastRob)) / 1000);
                return interaction.reply({ content: `⏰ Espera ${wait}s para volver a robar.`, ephemeral: true });
            }

            const success = Math.random() < 0.35;
            if (success) {
                const stolen = Math.min(Math.floor(Math.random() * 200) + 50, targetEco.wallet);
                if (stolen <= 0) return interaction.reply({ content: `❌ ${target.username} no tiene NC en la billetera.`, ephemeral: true });
                targetEco.wallet -= stolen;
                myEco.wallet += stolen;
                myEco.lastRob = Date.now();
                await db.setUserEconomy(target.id, targetEco);
                await db.setUserEconomy(interaction.user.id, myEco);
                await interaction.reply(`🦹 **¡Robo exitoso!** Le robaste **${stolen} NC** a **${target.username}**.`);
            } else {
                const fine = Math.floor(Math.random() * 100) + 50;
                myEco.wallet = Math.max(0, myEco.wallet - fine);
                myEco.lastRob = Date.now();
                await db.setUserEconomy(interaction.user.id, myEco);
                await interaction.reply(`👮 **Te atraparon!** Multa de **${fine} NC**.`);
            }
        },
        async executePrefix(message, args) {
            const target = message.mentions.users.first();
            if (!target) return message.reply("❌ Menciona a alguien. Uso: `!rob @usuario`");
            if (target.id === message.author.id) return message.reply("❌ No puedes robarte a ti mismo.");

            const myEco = await db.getUserEconomy(message.author.id);
            const targetEco = await db.getUserEconomy(target.id);

            if (Date.now() - (myEco.lastRob || 0) < 60000) {
                const wait = Math.ceil((60000 - (Date.now() - myEco.lastRob)) / 1000);
                return message.reply(`⏰ Espera ${wait}s para volver a robar.`);
            }

            const success = Math.random() < 0.35;
            if (success) {
                const stolen = Math.min(Math.floor(Math.random() * 200) + 50, targetEco.wallet);
                if (stolen <= 0) return message.reply(`❌ ${target.username} no tiene NC en la billetera.`);
                targetEco.wallet -= stolen;
                myEco.wallet += stolen;
                myEco.lastRob = Date.now();
                await db.setUserEconomy(target.id, targetEco);
                await db.setUserEconomy(message.author.id, myEco);
                await message.reply(`🦹 **¡Robo exitoso!** Le robaste **${stolen} NC** a **${target.username}**.`);
            } else {
                const fine = Math.floor(Math.random() * 100) + 50;
                myEco.wallet = Math.max(0, myEco.wallet - fine);
                myEco.lastRob = Date.now();
                await db.setUserEconomy(message.author.id, myEco);
                await message.reply(`👮 **Te atraparon!** Multa de **${fine} NC**.`);
            }
        }
    },
    {
        name: "lottery",
        description: "Compra un ticket de lotería.",
        category: "economia",
        aliases: ["loteria", "ticket"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description)
                .addStringOption(o => o.setName("cantidad").setDescription("1ticket, 3tickets o 5tickets").setRequired(true));
        },
        async executeSlash(interaction) {
            const amount = interaction.options.getString("cantidad").toLowerCase().replace(/\s/g, "");
            const price = LOTTERY_PRICES[amount];
            if (!price) return interaction.reply({ content: "❌ Opciones: `1ticket` (100 NC), `3tickets` (250 NC), `5tickets` (400 NC)", ephemeral: true });

            const eco = await db.getUserEconomy(interaction.user.id);
            if (eco.wallet < price) return interaction.reply({ content: `❌ Necesitas **${price} NC** en tu billetera. Tienes ${eco.wallet} NC.`, ephemeral: true });

            eco.wallet -= price;
            const tickets = parseInt(amount);
            const wins = Math.floor(Math.random() * (tickets * 2));
            const prize = wins * (Math.floor(Math.random() * 150) + 50);
            eco.wallet += prize;
            await db.setUserEconomy(interaction.user.id, eco);

            const embed = new EmbedBuilder()
                .setTitle("🎰 Lotería")
                .setDescription(`Compraste **${tickets}** ticket(s) por **${price} NC**\n\nGanaste: **${prize} NC** ${prize > price ? "💰" : "😅"}`)
                .setColor(prize > price ? "#34d399" : "#f87171");
            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const amount = (args[0] || "").toLowerCase().replace(/\s/g, "");
            const price = LOTTERY_PRICES[amount];
            if (!price) return message.reply("❌ Opciones: `!lottery 1ticket` (100 NC), `3tickets` (250 NC), `5tickets` (400 NC)");

            const eco = await db.getUserEconomy(message.author.id);
            if (eco.wallet < price) return message.reply(`❌ Necesitas **${price} NC**. Tienes ${eco.wallet} NC.`);

            eco.wallet -= price;
            const tickets = parseInt(amount);
            const wins = Math.floor(Math.random() * (tickets * 2));
            const prize = wins * (Math.floor(Math.random() * 150) + 50);
            eco.wallet += prize;
            await db.setUserEconomy(message.author.id, eco);

            await message.reply(`🎰 Lotería: Compraste **${tickets}** ticket(s) por **${price} NC**. Ganaste: **${prize} NC** ${prize > price ? "💰" : "😅"}`);
        }
    },
    {
        name: "work2",
        description: "Trabaja en un empleo diferente (con nivel).",
        category: "economia",
        aliases: ["trabajar2"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const eco = await db.getUserEconomy(interaction.user.id);
            const level = eco.level || 0;
            const available = WORK_JOBS_2.filter(j => level >= j.reqLevel);
            const job = available[Math.floor(Math.random() * available.length)];
            const earned = Math.floor(Math.random() * (job.max - job.min)) + job.min;

            if (Date.now() - (eco.lastWorked || 0) < 1800000) {
                const wait = Math.ceil((1800000 - (Date.now() - eco.lastWorked)) / 60000);
                return interaction.reply({ content: `⏰ Espera ${wait} min para volver a trabajar.`, ephemeral: true });
            }

            eco.wallet += earned;
            eco.lastWorked = Date.now();
            await db.setUserEconomy(interaction.user.id, eco);
            await interaction.reply(`${job.emoji} **${job.name}**: Ganaste **${earned} NC**!`);
        },
        async executePrefix(message) {
            const eco = await db.getUserEconomy(message.author.id);
            const level = eco.level || 0;
            const available = WORK_JOBS_2.filter(j => level >= j.reqLevel);
            const job = available[Math.floor(Math.random() * available.length)];
            const earned = Math.floor(Math.random() * (job.max - job.min)) + job.min;

            if (Date.now() - (eco.lastWorked || 0) < 1800000) {
                const wait = Math.ceil((1800000 - (Date.now() - eco.lastWorked)) / 60000);
                return message.reply(`⏰ Espera ${wait} min para volver a trabajar.`);
            }

            eco.wallet += earned;
            eco.lastWorked = Date.now();
            await db.setUserEconomy(message.author.id, eco);
            await message.reply(`${job.emoji} **${job.name}**: Ganaste **${earned} NC**!`);
        }
    },
    {
        name: "trivia-money",
        description: "Responde trivia y gana NC.",
        category: "economia",
        aliases: ["triviadinero"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const q = TRIVIA_ECONOMY[Math.floor(Math.random() * TRIVIA_ECONOMY.length)];
            const shuffled = [...q.o].sort(() => Math.random() - 0.5);
            const letters = ["A", "B", "C", "D"];
            const desc = shuffled.map((o, i) => `**${letters[i]}.** ${o}`).join("\n");
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle("💰 Trivia Económico").setDescription(`${q.q}\n\n${desc}`).setColor("#fbbf24").setFooter({ text: "Tienes 15s para responder" })] });
            const filter = m => m.author.id === interaction.user.id;
            try {
                const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] });
                const ans = collected.first().content.toUpperCase();
                const idx = letters.indexOf(ans);
                if (idx !== -1 && shuffled[idx] === q.a) {
                    const prize = Math.floor(Math.random() * 200) + 100;
                    const eco = await db.getUserEconomy(interaction.user.id);
                    eco.wallet += prize;
                    await db.setUserEconomy(interaction.user.id, eco);
                    await interaction.followUp(`✅ **¡Correcto!** Ganaste **${prize} NC**!`);
                } else {
                    await interaction.followUp(`❌ **Incorrecto.** La respuesta era: **${q.a}**`);
                }
            } catch {
                await interaction.followUp(`⏰ **Tiempo agotado.** La respuesta era: **${q.a}**`);
            }
        },
        async executePrefix(message) {
            const q = TRIVIA_ECONOMY[Math.floor(Math.random() * TRIVIA_ECONOMY.length)];
            const shuffled = [...q.o].sort(() => Math.random() - 0.5);
            const letters = ["A", "B", "C", "D"];
            const desc = shuffled.map((o, i) => `**${letters[i]}.** ${o}`).join("\n");
            const msg = await message.reply({ embeds: [new EmbedBuilder().setTitle("💰 Trivia Económico").setDescription(`${q.q}\n\n${desc}`).setColor("#fbbf24")] });
            const filter = m => m.author.id === message.author.id;
            try {
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] });
                const ans = collected.first().content.toUpperCase();
                const idx = letters.indexOf(ans);
                if (idx !== -1 && shuffled[idx] === q.a) {
                    const prize = Math.floor(Math.random() * 200) + 100;
                    const eco = await db.getUserEconomy(message.author.id);
                    eco.wallet += prize;
                    await db.setUserEconomy(message.author.id, eco);
                    await message.channel.send(`✅ **¡Correcto!** Ganaste **${prize} NC**!`);
                } else {
                    await message.channel.send(`❌ **Incorrecto.** La respuesta era: **${q.a}**`);
                }
            } catch {
                await message.channel.send(`⏰ **Tiempo agotado.** La respuesta era: **${q.a}**`);
            }
        }
    },
];
