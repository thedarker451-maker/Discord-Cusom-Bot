import { SlashCommandBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (c) => {
        const code = c.charCodeAt(0);
        const base = code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function caesar(str, shift) {
    shift = (shift % 26 + 26) % 26;
    return str.replace(/[a-zA-Z]/g, (c) => {
        const code = c.charCodeAt(0);
        const base = code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - base + shift) % 26) + base);
    });
}

function textToBinary(str) {
    return str.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}

function binaryToText(binStr) {
    try {
        return binStr.split(/ +/).map(b => String.fromCharCode(parseInt(b, 2))).join("");
    } catch {
        return null;
    }
}

function runCrypto(action, type, text, shift = 3) {
    if (!text || text.trim() === "") return "Debes proporcionar un texto válido.";
    
    try {
        if (action === "encrypt") {
            switch (type) {
                case "base64": return Buffer.from(text).toString("base64");
                case "hex": return Buffer.from(text).toString("hex");
                case "binary": return textToBinary(text);
                case "rot13": return rot13(text);
                case "caesar": return caesar(text, shift);
                default: return "Tipo de encriptación no soportado.";
            }
        } else if (action === "decrypt") {
            switch (type) {
                case "base64": return Buffer.from(text, "base64").toString("utf-8");
                case "hex": return Buffer.from(text, "hex").toString("utf-8");
                case "binary": return binaryToText(text) || "Formato binario incorrecto.";
                case "rot13": return rot13(text);
                case "caesar": return caesar(text, -shift);
                default: return "Tipo de desencriptación no soportado.";
            }
        }
    } catch (err) {
        return `Error al procesar: ${err.message}`;
    }
}

export const cryptoCommands = [
    {
        name: "encrypt",
        description: "Encripta un mensaje usando varios métodos.",
        category: "general",
        aliases: ["encriptar"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt
                    .setName("metodo")
                    .setDescription("Método de cifrado")
                    .setRequired(true)
                    .addChoices(
                        { name: "Base64", value: "base64" },
                        { name: "Hexadecimal (Hex)", value: "hex" },
                        { name: "Binario", value: "binary" },
                        { name: "ROT13", value: "rot13" },
                        { name: "Cifrado César", value: "caesar" }
                    )
                )
                .addStringOption(opt => opt
                    .setName("texto")
                    .setDescription("El texto a encriptar")
                    .setRequired(true)
                )
                .addIntegerOption(opt => opt
                    .setName("desplazamiento")
                    .setDescription("Número de posiciones para César (defecto: 3)")
                    .setRequired(false)
                );
        },
        async executeSlash(interaction) {
            const metodo = interaction.options.getString("metodo");
            const texto = interaction.options.getString("texto");
            const shift = interaction.options.getInteger("desplazamiento") ?? 3;
            const result = runCrypto("encrypt", metodo, texto, shift);
            await interaction.reply(`${Emojis.cajaCerrada} **Mensaje Encriptado (${metodo.toUpperCase()}):**\n\`\`\`\n${result}\n\`\`\``);
        },
        async executePrefix(message, args) {
            if (args.length < 2) return message.reply("❌ Uso: `!encrypt <base64|hex|binary|rot13|caesar> [desplazamiento_cesar] <texto>`");
            const metodo = args[0].toLowerCase();
            let shift = 3;
            let textStartIdx = 1;
            if (metodo === "caesar") {
                const potentialShift = parseInt(args[1]);
                if (!isNaN(potentialShift)) { shift = potentialShift; textStartIdx = 2; }
            }
            const texto = args.slice(textStartIdx).join(" ");
            const result = runCrypto("encrypt", metodo, texto, shift);
            await message.reply(`${Emojis.cajaCerrada} **Mensaje Encriptado (${metodo.toUpperCase()}):**\n\`\`\`\n${result}\n\`\`\``);
        }
    },
    {
        name: "decrypt",
        description: "Desencripta un mensaje usando varios métodos.",
        category: "general",
        aliases: ["desencriptar"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(opt => opt
                    .setName("metodo")
                    .setDescription("Método de descifrado")
                    .setRequired(true)
                    .addChoices(
                        { name: "Base64", value: "base64" },
                        { name: "Hexadecimal (Hex)", value: "hex" },
                        { name: "Binario", value: "binary" },
                        { name: "ROT13", value: "rot13" },
                        { name: "Cifrado César", value: "caesar" }
                    )
                )
                .addStringOption(opt => opt
                    .setName("texto")
                    .setDescription("El texto a desencriptar")
                    .setRequired(true)
                )
                .addIntegerOption(opt => opt
                    .setName("desplazamiento")
                    .setDescription("Número de posiciones para César (defecto: 3)")
                    .setRequired(false)
                );
        },
        async executeSlash(interaction) {
            const metodo = interaction.options.getString("metodo");
            const texto = interaction.options.getString("texto");
            const shift = interaction.options.getInteger("desplazamiento") ?? 3;
            const result = runCrypto("decrypt", metodo, texto, shift);
            await interaction.reply({ content: `${Emojis.checkVerify} **Mensaje Desencriptado (${metodo.toUpperCase()}):**\n\`\`\`\n${result}\n\`\`\``, ephemeral: true });
        },
        async executePrefix(message, args) {
            if (args.length < 2) return message.reply("❌ Uso: `!decrypt <base64|hex|binary|rot13|caesar> [desplazamiento_cesar] <texto>`");
            const metodo = args[0].toLowerCase();
            let shift = 3;
            let textStartIdx = 1;
            if (metodo === "caesar") {
                const potentialShift = parseInt(args[1]);
                if (!isNaN(potentialShift)) { shift = potentialShift; textStartIdx = 2; }
            }
            const texto = args.slice(textStartIdx).join(" ");
            const result = runCrypto("decrypt", metodo, texto, shift);
            await message.reply(`${Emojis.checkVerify} **Mensaje Desencriptado (${metodo.toUpperCase()}):**\n\`\`\`\n${result}\n\`\`\``);
        }
    }
];
