import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import db from "../scr/database.js";
import Emojis from "../scr/emojis.js";

// Profesiones para /trabajar
const JOBS = {
    limpiador: { name: "🧹 Limpiador", pay: [50, 100], cd: 1000 * 60 * 60, reqLevel: 0 },
    repartidor: { name: "🍕 Repartidor", pay: [80, 150], cd: 1000 * 60 * 60 * 2, reqLevel: 2 },
    programador: { name: "👨‍💻 Programador", pay: [200, 400], cd: 1000 * 60 * 60 * 4, reqLevel: 5 },
    doctor: { name: "👨‍⚕️ Doctor", pay: [400, 700], cd: 1000 * 60 * 60 * 6, reqLevel: 10 },
    ceo: { name: "🚀 CEO", pay: [800, 1500], cd: 1000 * 60 * 60 * 8, reqLevel: 20 }
};

// Ítems de la tienda
const SHOP_ITEMS = [
    { id: "cana", name: "🎣 Caña de Pescar", price: 250, desc: "Requerida para pescar peces valiosos." },
    { id: "pico", name: "⛏️ Pico de Hierro", price: 500, desc: "Requerido para minar metales finos." },
    { id: "anillo", name: "💍 Anillo de Compromiso", price: 5000, desc: "Presume de tu riqueza o cásate con alguien." }
];

/** Menor probabilidad de ganar cuando la apuesta es alta (mín. 22%). */
function getBetWinChance(amount) {
    const base = 0.50;
    if (amount <= 50) return base;
    const reduction = Math.min(0.28, Math.log10(amount / 50) * 0.12);
    return Math.max(0.22, base - reduction);
}

export const economyCommands = [
    {
        name: "balance",
        description: "Muestra tu balance de billetera y banco.",
        category: "economia",
        aliases: ["bal", "monedas"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Ver balance de otro usuario").setRequired(false));
        },
        async executeSlash(interaction) {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const eco = await db.getUserEconomy(user.id);
            const total = eco.wallet + eco.bank;

            const embed = new EmbedBuilder()
                .setTitle(`💎 Balance de ${user.username}`)
                .setColor("#FFD700")
                .addFields(
                    { name: "👛 Billetera", value: `\`${eco.wallet.toLocaleString()} NC\``, inline: true },
                    { name: "🏦 Banco", value: `\`${eco.bank.toLocaleString()} NC\``, inline: true },
                    { name: "📊 Total Neto", value: `\`${total.toLocaleString()} NC\``, inline: false }
                )
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: "Custom Coins System" });

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const matches = args[0] ? args[0].match(/^<@!?(\d+)>$/) : null;
            const targetId = matches ? matches[1] : (args[0] || message.author.id);
            const user = await message.client.users.fetch(targetId).catch(() => message.author);
            
            const eco = await db.getUserEconomy(user.id);
            const total = eco.wallet + eco.bank;

            const embed = new EmbedBuilder()
                .setTitle(`💎 Balance de ${user.username}`)
                .setColor("#FFD700")
                .addFields(
                    { name: "👛 Billetera", value: `\`${eco.wallet.toLocaleString()} NC\``, inline: true },
                    { name: "🏦 Banco", value: `\`${eco.bank.toLocaleString()} NC\``, inline: true },
                    { name: "📊 Total Neto", value: `\`${total.toLocaleString()} NC\``, inline: false }
                )
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: "Custom Coins System" });

            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "daily",
        description: "Reclama tu recompensa diaria de Custom Coins.",
        category: "economia",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);
            const now = Date.now();
            const cd = 24 * 60 * 60 * 1000; // 24 horas

            if (now - eco.lastDaily < cd) {
                const diff = cd - (now - eco.lastDaily);
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏱️ Ya has reclamado tu recompensa diaria. Regresa en **${hrs}h ${mins}m**.`, ephemeral: true });
            }

            // Streak logic
            let streak = eco.dailyStreak;
            if (now - eco.lastDaily < cd * 2) {
                streak += 1;
            } else {
                streak = 1;
            }

            const baseReward = 200;
            const bonus = Math.min(streak * 20, 300); // Max 300 bonus
            const finalReward = baseReward + bonus;

            eco.wallet += finalReward;
            eco.lastDaily = now;
            eco.dailyStreak = streak;
            await db.setUserEconomy(userId, eco);

            const embed = new EmbedBuilder()
                .setTitle(`${Emojis.booster} Recompensa Diaria Reclamada`)
                .setDescription(`¡Has recibido **${finalReward} NC**! (Bono de racha x${streak})`)
                .setColor("#00F2FE")
                .setFooter({ text: `Racha actual: ${streak} días` });

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const userId = message.author.id;
            const eco = await db.getUserEconomy(userId);
            const now = Date.now();
            const cd = 24 * 60 * 60 * 1000;

            if (now - eco.lastDaily < cd) {
                const diff = cd - (now - eco.lastDaily);
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                return message.reply(`⏱️ Ya reclamaste tus monedas diarias. Regresa en **${hrs}h ${mins}m**.`);
            }

            let streak = eco.dailyStreak;
            if (now - eco.lastDaily < cd * 2) streak += 1;
            else streak = 1;

            const baseReward = 200;
            const bonus = Math.min(streak * 20, 300);
            const finalReward = baseReward + bonus;

            eco.wallet += finalReward;
            eco.lastDaily = now;
            eco.dailyStreak = streak;
            await db.setUserEconomy(userId, eco);

            await message.reply(`${Emojis.booster} ¡Reclamaste **${finalReward} NC** diarios! (Racha: ${streak} días).`);
        }
    },
    {
        name: "trabajar",
        description: "Trabaja en tu profesión actual para ganar Custom Coins.",
        category: "economia",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt
                    .setName("profesion")
                    .setDescription("Cambia tu profesión actual")
                    .setRequired(false)
                    .addChoices(
                        { name: "🧹 Limpiador (Nv. 0)", value: "limpiador" },
                        { name: "🍕 Repartidor (Nv. 2)", value: "repartidor" },
                        { name: "👨‍💻 Programador (Nv. 5)", value: "programador" },
                        { name: "👨‍⚕️ Doctor (Nv. 10)", value: "doctor" },
                        { name: "🚀 CEO (Nv. 20)", value: "ceo" }
                    )
                );
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);
            const lvl = await db.getUserLevel(userId);
            const now = Date.now();
            const setJob = interaction.options.getString("profesion");

            if (setJob) {
                const jobDetails = JOBS[setJob];
                if (lvl.level < jobDetails.reqLevel) {
                    return interaction.reply({ content: `❌ Necesitas ser Nivel **${jobDetails.reqLevel}** para trabajar de ${jobDetails.name}. Eres Nivel ${lvl.level}.`, ephemeral: true });
                }
                eco.job = setJob;
                await db.setUserEconomy(userId, eco);
                return interaction.reply({ content: `💼 Cambiaste tu profesión a **${jobDetails.name}** con éxito.`, ephemeral: true });
            }

            const currentJobName = eco.job || "limpiador";
            const job = JOBS[currentJobName] || JOBS.limpiador;

            if (now - eco.lastWorked < job.cd) {
                const remaining = job.cd - (now - eco.lastWorked);
                const mins = Math.ceil(remaining / (1000 * 60));
                return interaction.reply({ content: `⏱️ Estás cansado/a. Debes esperar **${mins} minutos** para volver a trabajar de ${job.name}.`, ephemeral: true });
            }

            const pay = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0];
            
            // Recompensas XP
            lvl.xp += Math.floor(Math.random() * 15) + 5;
            if (lvl.xp >= (lvl.level + 1) * 100) {
                lvl.level += 1;
                lvl.xp = 0;
                await interaction.channel.send(`🎉 ¡Felicitaciones ${interaction.user}! Has subido al **Nivel ${lvl.level}**!`);
            }
            await db.setUserLevel(userId, lvl);

            eco.wallet += pay;
            eco.lastWorked = now;
            await db.setUserEconomy(userId, eco);

            const narrativas = [
                `Trabajaste duro como ${job.name} y te pagaron **${pay} NC**.`,
                `Completaste tu turno de ${job.name}. Ganaste **${pay} NC** y algo de experiencia.`,
                `Tu jefe de ${job.name} elogió tu esfuerzo y te entregó **${pay} NC**.`
            ];
            const text = narrativas[Math.floor(Math.random() * narrativas.length)];

            await interaction.reply({ content: `💼 **${job.name}** | ${text}` });
        },
        async executePrefix(message, args) {
            const userId = message.author.id;
            const eco = await db.getUserEconomy(userId);
            const lvl = await db.getUserLevel(userId);
            const now = Date.now();

            const currentJobName = eco.job || "limpiador";
            const job = JOBS[currentJobName] || JOBS.limpiador;

            if (now - eco.lastWorked < job.cd) {
                const remaining = job.cd - (now - eco.lastWorked);
                const mins = Math.ceil(remaining / (1000 * 60));
                return message.reply(`⏱️ Debes esperar **${mins} minutos** para trabajar.`);
            }

            const pay = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0];
            
            lvl.xp += 10;
            if (lvl.xp >= (lvl.level + 1) * 100) {
                lvl.level += 1;
                lvl.xp = 0;
                await message.reply(`🎉 ¡Subiste al Nivel **${lvl.level}**!`);
            }
            await db.setUserLevel(userId, lvl);

            eco.wallet += pay;
            eco.lastWorked = now;
            await db.setUserEconomy(userId, eco);

            await message.reply(`💼 Trabajaste como **${job.name}** y ganaste **${pay} NC**.`);
        }
    },
    {
        name: "depositar",
        description: "Deposita monedas de tu billetera en el banco.",
        category: "economia",
        aliases: ["dep"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt.setName("cantidad").setDescription("Cantidad a depositar (o 'all' para todo)").setRequired(true));
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);
            const arg = interaction.options.getString("cantidad");

            let amount = 0;
            if (arg.toLowerCase() === "all") {
                amount = eco.wallet;
            } else {
                amount = parseInt(arg);
            }

            if (isNaN(amount) || amount <= 0) return interaction.reply({ content: "❌ Introduce una cantidad válida.", ephemeral: true });
            if (eco.wallet < amount) return interaction.reply({ content: "❌ No tienes suficientes monedas en la billetera.", ephemeral: true });

            eco.wallet -= amount;
            eco.bank += amount;
            await db.setUserEconomy(userId, eco);

            await interaction.reply({ content: `🏦 Depositaste **${amount.toLocaleString()} NC** en tu cuenta bancaria.` });
        },
        async executePrefix(message, args) {
            const userId = message.author.id;
            const eco = await db.getUserEconomy(userId);
            const arg = args[0];
            if (!arg) return message.reply("❌ Especifica una cantidad o 'all'.");

            let amount = 0;
            if (arg.toLowerCase() === "all") amount = eco.wallet;
            else amount = parseInt(arg);

            if (isNaN(amount) || amount <= 0) return message.reply("❌ Cantidad incorrecta.");
            if (eco.wallet < amount) return message.reply("❌ No tienes suficientes monedas.");

            eco.wallet -= amount;
            eco.bank += amount;
            await db.setUserEconomy(userId, eco);

            await message.reply(`🏦 Depositaste **${amount.toLocaleString()} NC** en tu banco.`);
        }
    },
    {
        name: "retirar",
        description: "Retira monedas de tu banco a tu billetera.",
        category: "economia",
        aliases: ["with"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt.setName("cantidad").setDescription("Cantidad a retirar (o 'all')").setRequired(true));
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);
            const arg = interaction.options.getString("cantidad");

            let amount = 0;
            if (arg.toLowerCase() === "all") amount = eco.bank;
            else amount = parseInt(arg);

            if (isNaN(amount) || amount <= 0) return interaction.reply({ content: "❌ Introduce una cantidad válida.", ephemeral: true });
            if (eco.bank < amount) return interaction.reply({ content: "❌ No tienes tantas monedas en el banco.", ephemeral: true });

            eco.bank -= amount;
            eco.wallet += amount;
            await db.setUserEconomy(userId, eco);

            await interaction.reply({ content: `👛 Retiraste **${amount.toLocaleString()} NC** de tu banco.` });
        },
        async executePrefix(message, args) {
            const userId = message.author.id;
            const eco = await db.getUserEconomy(userId);
            const arg = args[0];
            if (!arg) return message.reply("❌ Especifica una cantidad o 'all'.");

            let amount = 0;
            if (arg.toLowerCase() === "all") amount = eco.bank;
            else amount = parseInt(arg);

            if (isNaN(amount) || amount <= 0) return message.reply("❌ Cantidad incorrecta.");
            if (eco.bank < amount) return message.reply("❌ No tienes tantas monedas en el banco.");

            eco.bank -= amount;
            eco.wallet += amount;
            await db.setUserEconomy(userId, eco);

            await message.reply(`👛 Retiraste **${amount.toLocaleString()} NC** de tu banco.`);
        }
    },
    {
        name: "transferir",
        description: "Transfiere Custom Coins de tu billetera a otro miembro.",
        category: "economia",
        aliases: ["pay", "donar"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(opt => opt.setName("usuario").setDescription("Miembro receptor").setRequired(true))
                .addIntegerOption(opt => opt.setName("cantidad").setDescription("Monto a enviar").setRequired(true));
        },
        async executeSlash(interaction) {
            const senderId = interaction.user.id;
            const receiver = interaction.options.getUser("usuario");
            const amount = interaction.options.getInteger("cantidad");

            if (receiver.id === senderId) return interaction.reply({ content: "❌ No puedes transferirte monedas a ti mismo.", ephemeral: true });
            if (amount <= 0) return interaction.reply({ content: "❌ Monto inválido.", ephemeral: true });

            const sEco = await db.getUserEconomy(senderId);
            if (sEco.wallet < amount) return interaction.reply({ content: "❌ No tienes suficientes monedas en billetera para enviar.", ephemeral: true });

            const rEco = await db.getUserEconomy(receiver.id);

            sEco.wallet -= amount;
            rEco.wallet += amount;

            await db.setUserEconomy(senderId, sEco);
            await db.setUserEconomy(receiver.id, rEco);

            await interaction.reply({ content: `💸 Transferencia exitosa de **${amount.toLocaleString()} NC** a **${receiver.tag}**.` });
        },
        async executePrefix(message, args) {
            const senderId = message.author.id;
            const matches = args[0] ? args[0].match(/^<@!?(\d+)>$/) : null;
            if (!matches) return message.reply("❌ Menciona a un usuario receptor. Ej: `!transferir @usuario 100`");
            
            const receiverId = matches[1];
            const amount = parseInt(args[1]);

            if (receiverId === senderId) return message.reply("❌ No te transfieras a ti mismo.");
            if (isNaN(amount) || amount <= 0) return message.reply("❌ Cantidad incorrecta.");

            const sEco = await db.getUserEconomy(senderId);
            if (sEco.wallet < amount) return message.reply("❌ No tienes suficientes monedas.");

            const rEco = await db.getUserEconomy(receiverId);

            sEco.wallet -= amount;
            rEco.wallet += amount;

            await db.setUserEconomy(senderId, sEco);
            await db.setUserEconomy(receiverId, rEco);

            await message.reply(`💸 Transferiste **${amount.toLocaleString()} NC** a <@${receiverId}>.`);
        }
    },
    {
        name: "tienda",
        description: "Abre la tienda de Custom para comprar herramientas e ítems especiales.",
        category: "economia",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const embed = new EmbedBuilder()
                .setTitle(`🏪 Tienda Oficial — Custom Discord Bot`)
                .setDescription("Adquiere equipamiento o complementos utilizando tus Custom Coins. Compra usando `/comprar [id]`")
                .setColor("#00F2FE")
                .addFields(
                    SHOP_ITEMS.map(i => ({
                        name: `${i.name} (\`id: ${i.id}\`)`,
                        value: `Precio: **${i.price} NC**\n_${i.desc}_`
                    }))
                );

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const embed = new EmbedBuilder()
                .setTitle(`🏪 Tienda Oficial — Custom Discord Bot`)
                .setDescription("Adquiere equipamiento o complementos utilizando tus Custom Coins. Compra usando `!comprar [id]`")
                .setColor("#00F2FE")
                .addFields(
                    SHOP_ITEMS.map(i => ({
                        name: `${i.name} (\`id: ${i.id}\`)`,
                        value: `Precio: **${i.price} NC**\n_${i.desc}_`
                    }))
                );

            await message.reply({ embeds: [embed] });
        }
    },
    {
        name: "comprar",
        description: "Compra un ítem de la tienda de Custom.",
        category: "economia",
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt
                    .setName("item_id")
                    .setDescription("ID del ítem a comprar")
                    .setRequired(true)
                    .addChoices(
                        { name: "🎣 Caña de Pescar (250 NC)", value: "cana" },
                        { name: "⛏️ Pico de Hierro (500 NC)", value: "pico" },
                        { name: "💍 Anillo de Compromiso (5000 NC)", value: "anillo" }
                    )
                );
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const itemId = interaction.options.getString("item_id");
            const item = SHOP_ITEMS.find(i => i.id === itemId);

            const eco = await db.getUserEconomy(userId);
            if (eco.wallet < item.price) {
                return interaction.reply({ content: `❌ No tienes suficientes monedas en billetera. El precio es de **${item.price} NC**.`, ephemeral: true });
            }

            eco.wallet -= item.price;
            if (!eco.inventory) eco.inventory = [];
            eco.inventory.push(item.id);
            await db.setUserEconomy(userId, eco);

            await interaction.reply({ content: `🛒 Compraste **${item.name}** con éxito por **${item.price} NC**.` });
        },
        async executePrefix(message, args) {
            const userId = message.author.id;
            const itemId = args[0];
            const item = SHOP_ITEMS.find(i => i.id === itemId);
            if (!item) return message.reply("❌ Especifica una ID válida. Revisa `!tienda`.");

            const eco = await db.getUserEconomy(userId);
            if (eco.wallet < item.price) return message.reply("❌ No tienes suficientes monedas.");

            eco.wallet -= item.price;
            if (!eco.inventory) eco.inventory = [];
            eco.inventory.push(item.id);
            await db.setUserEconomy(userId, eco);

            await message.reply(`🛒 Compraste **${item.name}** por **${item.price} NC**.`);
        }
    },
    {
        name: "inventario",
        description: "Muestra tus herramientas e ítems comprados.",
        category: "economia",
        aliases: ["inv", "bag"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const eco = await db.getUserEconomy(interaction.user.id);
            const inv = eco.inventory || [];
            
            const count = {};
            inv.forEach(id => count[id] = (count[id] || 0) + 1);

            const list = Object.keys(count).map(id => {
                const item = SHOP_ITEMS.find(i => i.id === id);
                return `• **${item ? item.name : id}** x${count[id]}`;
            }).join("\n") || "Tu inventario está vacío.";

            const embed = new EmbedBuilder()
                .setTitle(`🎒 Inventario de ${interaction.user.username}`)
                .setDescription(list)
                .setColor("#5865F2");

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const eco = await db.getUserEconomy(message.author.id);
            const inv = eco.inventory || [];
            
            const count = {};
            inv.forEach(id => count[id] = (count[id] || 0) + 1);

            const list = Object.keys(count).map(id => {
                const item = SHOP_ITEMS.find(i => i.id === id);
                return `• **${item ? item.name : id}** x${count[id]}`;
            }).join("\n") || "Vacío.";

            await message.reply(`🎒 **Tu Inventario:**\n${list}`);
        }
    },
    {
        name: "pescaria",
        description: "Sal a pescar para atrapar especímenes valiosos. Requiere Caña de Pescar.",
        category: "economia",
        aliases: ["pescar"],
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);

            if (!eco.inventory || !eco.inventory.includes("cana")) {
                return interaction.reply({ content: `❌ Necesitas comprar una **🎣 Caña de Pescar** en la tienda (\`/tienda\`) primero.`, ephemeral: true });
            }

            const peces = [
                { name: "🐟 Pez Común", price: 30 },
                { name: "🐠 Pez Raro", price: 80 },
                { name: "🐙 Pulpo", price: 150 },
                { name: "🦈 Tiburón Blanco", price: 400 }
            ];

            const chance = Math.random();
            let pez;
            if (chance < 0.50) pez = peces[0];
            else if (chance < 0.80) pez = peces[1];
            else if (chance < 0.95) pez = peces[2];
            else pez = peces[3];

            eco.wallet += pez.price;
            await db.setUserEconomy(userId, eco);

            await interaction.reply({ content: `🎣 Saliste a pescar y lograste atrapar un **${pez.name}**! Lo vendiste de inmediato por **${pez.price} NC**.` });
        },
        async executePrefix(message, args) {
            const eco = await db.getUserEconomy(message.author.id);
            if (!eco.inventory || !eco.inventory.includes("cana")) {
                return message.reply("❌ Necesitas una `cana` para pescar.");
            }

            const pay = Math.floor(Math.random() * 100) + 20;
            eco.wallet += pay;
            await db.setUserEconomy(message.author.id, eco);

            await message.reply(`🎣 Saliste a pescar y obtuviste **${pay} NC** por tus peces.`);
        }
    },
    {
        name: "minar",
        description: "Mina metales valiosos en la cueva. Requiere Pico de Hierro.",
        category: "economia",
        slashBuilder() {
            return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const eco = await db.getUserEconomy(userId);

            if (!eco.inventory || !eco.inventory.includes("pico")) {
                return interaction.reply({ content: `❌ Necesitas comprar un **⛏️ Pico de Hierro** en la tienda (\`/tienda\`) primero.`, ephemeral: true });
            }

            const gemas = [
                { name: "🪨 Piedra", price: 20 },
                { name: "🪙 Mineral de Oro", price: 100 },
                { name: "💎 Diamante Puro", price: 300 },
                { name: "🌌 Netherita", price: 800 }
            ];

            const chance = Math.random();
            let gema;
            if (chance < 0.55) gema = gemas[0];
            else if (chance < 0.85) gema = gemas[1];
            else if (chance < 0.97) gema = gemas[2];
            else gema = gemas[3];

            eco.wallet += gema.price;
            await db.setUserEconomy(userId, eco);

            await interaction.reply({ content: `⛏️ Fuiste a la mina profunda y picaste un **${gema.name}**! Vendido por **${gema.price} NC**.` });
        },
        async executePrefix(message, args) {
            const eco = await db.getUserEconomy(message.author.id);
            if (!eco.inventory || !eco.inventory.includes("pico")) {
                return message.reply("❌ Necesitas un `pico` para minar.");
            }

            const pay = Math.floor(Math.random() * 150) + 30;
            eco.wallet += pay;
            await db.setUserEconomy(message.author.id, eco);

            await message.reply(`⛏️ Minaste materiales valiosos y los vendiste por **${pay} NC**.`);
        }
    },
    {
        name: "apostar",
        description: "Apuesta una cantidad de Custom Coins en una apuesta 50/50.",
        category: "economia",
        aliases: ["bet"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(opt => opt.setName("cantidad").setDescription("Cantidad a apostar").setRequired(true));
        },
        async executeSlash(interaction) {
            const userId = interaction.user.id;
            const bet = interaction.options.getInteger("cantidad");

            if (bet <= 0) return interaction.reply({ content: "❌ Cantidad inválida.", ephemeral: true });
            
            const eco = await db.getUserEconomy(userId);
            if (eco.wallet < bet) return interaction.reply({ content: "❌ No tienes esa cantidad en billetera.", ephemeral: true });

            const winChance = getBetWinChance(bet);
            const won = Math.random() < winChance;
            const pct = Math.round(winChance * 100);
            if (won) {
                eco.wallet += bet;
                await db.setUserEconomy(userId, eco);
                await interaction.reply({ content: `🎲 **¡Ganaste!** (${pct}% prob.) Se te ha doblado tu apuesta. Ganancia: **+${bet} NC**.` });
            } else {
                eco.wallet -= bet;
                await db.setUserEconomy(userId, eco);
                await interaction.reply({ content: `🎲 **¡Perdiste!** (${pct}% prob.) Pérdida: **-${bet} NC**.` });
            }
        },
        async executePrefix(message, args) {
            const bet = parseInt(args[0]);
            if (isNaN(bet) || bet <= 0) return message.reply("❌ Especifica una apuesta correcta.");

            const eco = await db.getUserEconomy(message.author.id);
            if (eco.wallet < bet) return message.reply("❌ Monedas insuficientes.");

            const winChance = getBetWinChance(bet);
            const won = Math.random() < winChance;
            const pct = Math.round(winChance * 100);
            if (won) {
                eco.wallet += bet;
                await message.reply(`🎲 **¡Ganaste!** (${pct}% prob.) Ganaste **+${bet} NC**.`);
            } else {
                eco.wallet -= bet;
                await message.reply(`🎲 **¡Perdiste!** (${pct}% prob.) Perdiste **-${bet} NC**.`);
            }
            await db.setUserEconomy(message.author.id, eco);
        }
    },
    {
        name: "top",
        description: "Muestra el ranking de los usuarios más ricos del servidor.",
        category: "economia",
        aliases: ["leaderboard", "ranking", "rich"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addIntegerOption(opt => opt.setName("limite").setDescription("Cantidad de puestos (max 15)").setMinValue(3).setMaxValue(15));
        },
        async executeSlash(interaction) {
            const limit = interaction.options.getInteger("limite") || 10;
            const board = await db.getEconomyLeaderboard(limit);

            if (!board.length) {
                return interaction.reply({ content: "📭 Aún no hay datos en el ranking.", ephemeral: true });
            }

            const medals = ["🥇", "🥈", "🥉"];
            const lines = await Promise.all(board.map(async (entry, i) => {
                const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
                const name = user?.username || `Usuario ${entry.userId.slice(-4)}`;
                const medal = medals[i] || `\`${i + 1}.\``;
                return `${medal} **${name}** — \`${entry.total.toLocaleString()} CC\``;
            }));

            const embed = new EmbedBuilder()
                .setTitle("🏆 Leaderboard — Custom Coins")
                .setDescription(lines.join("\n"))
                .setColor("#FFD700")
                .setFooter({ text: "Custom Discord Bot · Economía" });

            await interaction.reply({ embeds: [embed] });
        },
        async executePrefix(message, args) {
            const limit = Math.min(15, Math.max(3, parseInt(args[0]) || 10));
            const board = await db.getEconomyLeaderboard(limit);

            if (!board.length) return message.reply("📭 Aún no hay datos en el ranking.");

            const medals = ["🥇", "🥈", "🥉"];
            const lines = await Promise.all(board.map(async (entry, i) => {
                const user = await message.client.users.fetch(entry.userId).catch(() => null);
                const name = user?.username || `Usuario ${entry.userId.slice(-4)}`;
                const medal = medals[i] || `\`${i + 1}.\``;
                return `${medal} **${name}** — \`${entry.total.toLocaleString()} CC\``;
            }));

            await message.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("🏆 Leaderboard — Custom Coins")
                    .setDescription(lines.join("\n"))
                    .setColor("#FFD700")
                    .setFooter({ text: "Custom Discord Bot · Economía" })]
            });
        }
    }
];
