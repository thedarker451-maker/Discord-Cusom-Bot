import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const name = process.argv[2];
const description = process.argv[3] || "Comando creado automáticamente.";
const category = process.argv[4] || "utilidad";

if (!name) {
    console.log("\n==================================================");
    console.log("🛠️  CUSTOM DISCORD BOT — Creador de Comandos Rápido");
    console.log("==================================================");
    console.log("Uso: npm run create-command <nombre-comando> [descripción] [categoría]");
    console.log("Ejemplo: npm run create-command saludo \"Saluda al usuario\" general\n");
    process.exit(1);
}

const cleanedName = name.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
const targetFile = path.resolve(__dirname, `../comandos/${cleanedName}.js`);

if (fs.existsSync(targetFile)) {
    console.error(`[!] Error: El comando "${cleanedName}" ya existe en comandos/${cleanedName}.js`);
    process.exit(1);
}

const template = `import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

// Custom Emojis del bot
const emojis = {
    ban: "<:ban_emoji:1514005594644811964>",
    moderator: "<:moderator_emoji:1514005125851517038>",
    banHammer: "<:ban_hammer_lol:1514004678705418250>",
    cajaCerrada: "<:caja_cerada:1514003943506575380>",
    discord: "<:discord_emoji:1513286948649697424>",
    info: "<:5288informationbadge:1515490149738348594>",
    check: "<a:animated_check_marck_verify:1515487139779969085>",
    prohibido: "<:simbolo_de_prohibicion_blanco:1515487681810006066>"
};

export const ${cleanedName}Command = [
    {
        name: "${cleanedName}",
        description: "${description}",
        category: "${category}",
        aliases: [], // Añade alias aquí para comandos de prefijo (ej: ["saludar"])

        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description);
                // Si necesitas opciones, agrégalas aquí. Ej:
                // .addStringOption(opt => opt.setName("parametro").setDescription("descripcion").setRequired(false))
        },

        async executeSlash(interaction) {
            // Lógica para comandos Slash (/)
            const embed = new EmbedBuilder()
                .setTitle(\`\${emojis.check} Comando ${cleanedName} ejecutado!\`)
                .setDescription("¡Comando base creado exitosamente!")
                .setColor("#5865F2")
                .setFooter({ text: \`Solicitado por \${interaction.user.tag}\` });

            await interaction.reply({ embeds: [embed] });
        },

        async executePrefix(message, args) {
            // Lógica para comandos clásicos con prefijo (!)
            const embed = new EmbedBuilder()
                .setTitle(\`\${emojis.check} Comando ${cleanedName} ejecutado!\`)
                .setDescription("¡Comando base creado exitosamente!")
                .setColor("#5865F2")
                .setFooter({ text: \`Solicitado por \${message.author.tag}\` });

            await message.reply({ embeds: [embed] });
        }
    }
];
`;

fs.writeFileSync(targetFile, template, "utf8");
console.log(`[+] Comando creado con éxito en: comandos/${cleanedName}.js`);
console.log(`[*] Se cargará automáticamente al iniciar el bot.`);
