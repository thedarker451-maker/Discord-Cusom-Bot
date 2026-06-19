import { EmbedBuilder } from "discord.js";
import Emojis from "./emojis.js";

const CATEGORY_LABELS = {
    general: `${Emojis.home} General & Fun`,
    diversión: `${Emojis.evento} Diversión`,
    fun: `${Emojis.evento} Diversión`,
    economia: `${Emojis.booster} Economía`,
    musica: `${Emojis.music} Música`,
    moderacion: `${Emojis.moderator} Moderación`,
    recovery: `${Emojis.thread} Recovery`,
    utilidad: `${Emojis.info} Utilidades`,
    ai: `${Emojis.cloud} IA`,
    crypto: `${Emojis.reglas} Criptografía`
};

const CATEGORY_ORDER = [
    "general", "fun", "diversión", "utilidad", "ai", "crypto",
    "economia", "musica", "moderacion", "recovery"
];

function groupCommands(commands) {
    const groups = {};
    for (const cmd of commands) {
        const cat = (cmd.category || "general").toLowerCase();
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(cmd);
    }
    return groups;
}

function formatCommandLine(cmd, prefix) {
    const alias = cmd.aliases?.length ? ` · \`${prefix}${cmd.aliases[0]}\`` : "";
    const desc = cmd.description?.length > 42
        ? `${cmd.description.slice(0, 39)}...`
        : (cmd.description || "Sin descripción");
    return `\`/${cmd.name}\`${alias} — ${desc}`;
}

export function buildHelpEmbed(commands, { prefix = "!", requester = "Usuario" } = {}) {
    const groups = groupCommands(commands);
    const sortedCats = [
        ...CATEGORY_ORDER.filter(c => groups[c]),
        ...Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c))
    ];

    const embed = new EmbedBuilder()
        .setTitle("🤖 Custom Discord Bot — Panel de Ayuda")
        .setDescription(
            "Comandos organizados por categoría. Usa `/` para slash o el prefijo `" + prefix + "` para clásicos.\n" +
            `**Total:** \`${commands.length}\` comandos activos`
        )
        .setColor("#5865F2")
        .setThumbnail("https://github.com/thedarker451-maker/Discord-Cusom-Bot/blob/main/personalizacion/5288-information-badge.png?raw=true")
        .setFooter({ text: `Custom Discord Bot · Tip: usa /help · Solicitado por ${requester}` });

    const fields = [];
    for (const cat of sortedCats) {
        const cmds = groups[cat].sort((a, b) => a.name.localeCompare(b.name));
        const label = CATEGORY_LABELS[cat] || `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
        const lines = cmds.slice(0, 8).map(c => formatCommandLine(c, prefix));
        if (cmds.length > 8) lines.push(`*+${cmds.length - 8} más...*`);

        fields.push({
            name: label,
            value: lines.join("\n") || "—",
            inline: true
        });
    }

    // Máximo 3 columnas por fila (Discord permite 25 fields)
    for (let i = 0; i < fields.length; i += 3) {
        embed.addFields(fields.slice(i, i + 3));
    }

    return embed;
}
