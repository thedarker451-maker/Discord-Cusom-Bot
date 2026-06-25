import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvePublicBaseUrl } from "../scr/leaderboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TICKETS_DIR = join(__dirname, "..", "secrets", "tickets");
const COUNTER_FILE = join(TICKETS_DIR, "counter.json");

function getTicketCounter() {
    try {
        if (existsSync(COUNTER_FILE)) {
            return JSON.parse(readFileSync(COUNTER_FILE, "utf-8")).count || 0;
        }
    } catch {}
    return 0;
}

function saveTicketCounter(count) {
    try {
        mkdirSync(TICKETS_DIR, { recursive: true });
        writeFileSync(COUNTER_FILE, JSON.stringify({ count }, null, 2));
    } catch {}
}

function getTicketData(ticketId) {
    try {
        const file = join(TICKETS_DIR, `${ticketId}.json`);
        if (existsSync(file)) {
            return JSON.parse(readFileSync(file, "utf-8"));
        }
    } catch {}
    return null;
}

function saveTicketData(ticketId, data) {
    try {
        mkdirSync(TICKETS_DIR, { recursive: true });
        writeFileSync(join(TICKETS_DIR, `${ticketId}.json`), JSON.stringify(data, null, 2));
    } catch {}
}

function getTicketConfig() {
    try {
        const file = join(TICKETS_DIR, "config.json");
        if (existsSync(file)) return JSON.parse(readFileSync(file, "utf-8"));
    } catch {}
    return {};
}

function saveTicketConfig(data) {
    try {
        mkdirSync(TICKETS_DIR, { recursive: true });
        const current = getTicketConfig();
        writeFileSync(join(TICKETS_DIR, "config.json"), JSON.stringify({ ...current, ...data }, null, 2));
    } catch {}
}

const TICKET_COLORS = {
    creating: 4671303,
    open: 458496,
    closed: 2154320,
    error: 16711680
};

const TICKET_TYPES = {
    "soporte": { label: "Soporte General", emoji: "🎧", desc: "Ayuda con el bot o servidor" },
    "reporte": { label: "Reportar Usuario", emoji: "🚨", desc: "Reportar comportamiento" },
    "bug": { label: "Reportar Bug", emoji: "🐛", desc: "Reportar un error" },
    "sugerencia": { label: "Sugerencia", emoji: "💡", desc: "Ideas para mejorar" },
    "otro": { label: "Otro", emoji: "📝", desc: "Cualquier otra consulta" }
};

function createPanelEmbed(description) {
    return new EmbedBuilder()
        .setTitle("🎫 | Crea un ticket")
        .setDescription(description || "Selecciona el tipo de ticket que deseas crear.")
        .setColor(TICKET_COLORS.open)
        .setFooter({ text: "V.2.0 — Sistema de Tickets" });
}

function createPanelRow() {
    const options = Object.entries(TICKET_TYPES).map(([value, data]) => ({
        label: data.label,
        value: value,
        description: data.desc,
        emoji: { name: data.emoji }
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_create")
            .setPlaceholder("Ticket Opciones")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options)
    );
}

function createTicketEmbed(ticketId, user, type, reason) {
    const typeData = TICKET_TYPES[type] || TICKET_TYPES.otro;
    return new EmbedBuilder()
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(
            `<:discord_emoji:1513286948649697424> | Usuario: ${user}\n` +
            `<:3936faqbadge:1515490147146141706> | Tipo: ${typeData.emoji} ${typeData.label}\n` +
            `<:forumbadge:1515490141110669395> | Motivo: ${reason}\n\n` +
            `-# Un miembro del staff te atenderá pronto. Por favor, espera con paciencia.`
        )
        .setColor(TICKET_COLORS.open)
        .setTimestamp();
}

function createTicketActionsRow() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_actions")
            .setPlaceholder("Acciones Disponibles")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                { label: "Ping Staff", value: "ping_staff", description: "Notificar al staff", emoji: { name: "🔔" } },
                { label: "Close Ticket", value: "close", description: "Cerrar el ticket", emoji: { name: "📪" } },
                { label: "Delete Ticket", value: "delete", description: "Eliminar el ticket", emoji: { name: "🗑️" } },
                { label: "Archivar Ticket", value: "archive", description: "Archivar para después", emoji: { name: "🗃️" } }
            ])
    );
}

// ── Recolectar historial de mensajes del hilo ────────────────
async function collectChatHistory(thread) {
    const messages = [];
    let lastId = null;
    
    // Recolectar todos los mensajes (máximo 500)
    for (let i = 0; i < 5; i++) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        
        const fetched = await thread.messages.fetch(options);
        if (fetched.size === 0) break;
        
        for (const msg of fetched.values()) {
            messages.push({
                author: msg.author?.tag || "Desconocido",
                authorId: msg.author?.id || "0",
                isBot: msg.author?.bot || false,
                content: msg.content || "",
                attachments: msg.attachments.map(a => ({
                    name: a.name,
                    url: a.url,
                    type: a.contentType || "unknown"
                })),
                embeds: msg.embeds.length,
                timestamp: msg.createdAt.toISOString()
            });
            lastId = msg.id;
        }
    }
    
    return messages.reverse(); // Orden cronológico
}

// ── Crear foro/hilo de reporte (solo moderadores) ────────────
async function createTicketReport(interaction, ticketData, chatHistory, closeReason, extraNotes) {
    const guild = interaction.guild;
    const config = getTicketConfig();
    
    let forumChannel = null;
    
    // 1. Intentar usar el canal configurado por el usuario
    if (config.logsChannel) {
        forumChannel = guild.channels.cache.get(config.logsChannel);
    }
    
    // 2. Si no hay configurado, buscar por nombre
    if (!forumChannel) {
        forumChannel = guild.channels.cache.find(
            ch => ch.name === 'ticket-logs' && ch.type === ChannelType.GuildForum
        );
    }
    
    // 3. Si no existe, crearlo
    if (!forumChannel) {
        // Intentar crear el canal de foro
        try {
            const staffRoles = [];
            // Buscar roles de moderador/staff/admin
            const roleNames = ['moderador', 'mod', 'staff', 'admin', 'administrador', 'owner'];
            guild.roles.cache.forEach(role => {
                if (roleNames.some(r => role.name.toLowerCase().includes(r))) {
                    staffRoles.push(role.id);
                }
            });
            
            const permissionOverwrites = [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: guild.members.me.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ];
            
            // Agregar permisos para roles de staff
            for (const roleId of staffRoles) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                });
            }
            
            forumChannel = await guild.channels.create({
                name: 'ticket-logs',
                type: ChannelType.GuildForum,
                topic: '📋 Registros de tickets cerrados — Solo staff',
                permissionOverwrites,
                reason: 'Canal de logs de tickets creado automáticamente'
            });
        } catch (err) {
            console.error('[Ticket] No se pudo crear canal de foro:', err.message);
            return null;
        }
    }
    
    if (!forumChannel) return null;
    
    try {
        const typeData = TICKET_TYPES[ticketData.type] || TICKET_TYPES.otro;
        
        const reportEmbed = new EmbedBuilder()
            .setTitle(`📋 Ticket #${ticketData.ticketId} — Cerrado`)
            .setColor(TICKET_COLORS.closed)
            .addFields(
                { name: "👤 Usuario", value: `<@${ticketData.userId}> (${ticketData.userTag})`, inline: true },
                { name: "📁 Tipo", value: `${typeData.emoji} ${typeData.label}`, inline: true },
                { name: "📝 Motivo original", value: ticketData.reason || "N/A" },
                { name: "🔒 Motivo de cierre", value: closeReason || "Sin especificar" },
                { name: "📌 Notas extra", value: extraNotes || "Sin notas adicionales" },
                { name: "📊 Mensajes", value: `${chatHistory.length} mensajes en total`, inline: true },
                { name: "📅 Abierto", value: ticketData.createdAt || "N/A", inline: true },
                { name: "📅 Cerrado", value: new Date().toISOString(), inline: true }
            )
            .setTimestamp();
        
        // Listar imágenes adjuntas
        const attachments = chatHistory
            .flatMap(msg => msg.attachments)
            .filter(a => a.type?.startsWith('image/'));
        
        if (attachments.length > 0) {
            const imgList = attachments.slice(0, 10).map((a, i) => `${i + 1}. [${a.name}](${a.url})`).join('\n');
            reportEmbed.addFields({ name: "🖼️ Imágenes adjuntas", value: imgList });
        }
        
        const forumPost = await forumChannel.threads.create({
            name: `Ticket #${ticketData.ticketId} — ${ticketData.userTag}`,
            message: { embeds: [reportEmbed] },
            reason: `Log de ticket #${ticketData.ticketId} cerrado`
        });
        
        return forumPost;
    } catch (err) {
        console.error('[Ticket] Error creando post en foro:', err.message);
        return null;
    }
}

function createClosedEmbed(ticketId, user, type, reason, closeReason, moderator) {
    const typeData = TICKET_TYPES[type] || TICKET_TYPES.otro;
    return new EmbedBuilder()
        .setTitle(`Ticket #${ticketId}`)
        .setDescription(
            `Ticket cerrado:\n<:caja_cerada:1514003943506575380> | **Información**\n\n` +
            `<:discord_emoji:1513286948649697424> | Usuario: ${user}\n` +
            `<:3936faqbadge:1515490147146141706> | Tipo: ${typeData.emoji} ${typeData.label}\n` +
            `<:forumbadge:1515490141110669395> | Motivo: ${reason}\n\n` +
            `<:5288informationbadge:1515490149738348594> | Motivo de cierre: ${closeReason}\n` +
            `<:moderator_emoji:1514005125851517038> | Moderador: ${moderator}`
        )
        .setColor(TICKET_COLORS.closed)
        .setTimestamp();
}

export const ticketsCommand = [
    {
        name: "ticket",
        description: "Sistema de tickets de soporte",
        category: "utility",

        slashBuilder() {
            return new SlashCommandBuilder()
                .setName("ticket")
                .setDescription("Sistema de tickets de soporte")
                .addSubcommand(sub =>
                    sub.setName("panel")
                        .setDescription("Crear panel de tickets")
                        .addChannelOption(opt =>
                            opt.setName("canal")
                                .setDescription("Canal donde enviar el panel")
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Descripción del panel"))
                        .addChannelOption(opt =>
                            opt.setName("canal_logs")
                                .setDescription("Canal foro para guardar historiales al cerrar ticket")
                                .addChannelTypes(ChannelType.GuildForum)
                                .setRequired(false)));
        },

        async executeSlash(interaction) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: "❌ Necesitas permisos de administrador.", ephemeral: true });
            }

            const channel = interaction.options.getChannel("canal");
            const description = interaction.options.getString("descripcion");
            const logsChannel = interaction.options.getChannel("canal_logs");
            
            if (logsChannel) {
                saveTicketConfig({ logsChannel: logsChannel.id });
            }

            const embed = createPanelEmbed(description);
            const row = createPanelRow();

            await channel.send({ embeds: [embed], components: [row] });
            
            const extraMsg = logsChannel ? ` y logs configurados en ${logsChannel}` : "";
            return interaction.reply({ content: `✅ Panel enviado en ${channel}${extraMsg}`, ephemeral: true });
        },

        async handleSelect(interaction) {
            if (interaction.customId === "ticket_create") {
                const type = interaction.values[0];

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🎫 | Creando el ticket")
                            .setDescription("Por favor espera...")
                            .setColor(TICKET_COLORS.creating)
                            .setFooter({ text: "V.2.0" })
                    ],
                    ephemeral: true
                });

                const reason = "Ticket creado desde el panel";
                let ticketCounter = getTicketCounter();
                ticketCounter++;
                saveTicketCounter(ticketCounter);
                const ticketId = String(ticketCounter).padStart(4, "0");

                try {
                    const botMember = interaction.guild.members.me;
                    if (!botMember.permissionsIn(interaction.channel).has(PermissionFlagsBits.CreatePrivateThreads)) {
                        return interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("❌ Error")
                                    .setDescription("No tengo permisos para crear hilos privados en este canal.")
                                    .setColor(TICKET_COLORS.error)
                            ]
                        });
                    }

                    const thread = await interaction.channel.threads.create({
                        name: `ticket-${ticketId}`,
                        type: ChannelType.PrivateThread,
                        reason: `Ticket ${ticketId} de ${interaction.user.tag}`
                    });

                    await thread.members.add(interaction.user.id);

                    const ticketEmbed = createTicketEmbed(ticketId, `<@${interaction.user.id}>`, type, reason);
                    const actionsRow = createTicketActionsRow();

                    await thread.send({ embeds: [ticketEmbed], components: [actionsRow] });

                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("🎫 | Ticket Creado")
                                .setDescription("Ticket creado exitosamente")
                                .setColor(TICKET_COLORS.open)
                                .setFooter({ text: "V.2.0" })
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${thread.id}`)
                                    .setLabel("Llévame al ticket!")
                                    .setEmoji({ name: "7567serverguidebadge", id: "1515490156185129131" })
                            )
                        ]
                    });

                    saveTicketData(ticketId, {
                        ticketId,
                        userId: interaction.user.id,
                        userTag: interaction.user.tag,
                        type,
                        reason,
                        threadId: thread.id,
                        guildId: interaction.guildId,
                        channelId: interaction.channelId,
                        createdAt: new Date().toISOString(),
                        status: "open",
                        chatHistory: []
                    });

                } catch (err) {
                    console.error("[Ticket Error]", err);
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Error Fatal!")
                                .setColor(TICKET_COLORS.error)
                                .setDescription(`Console:\n${err.message}`)
                                .setFooter({ text: "Por favor reporta el error al github" })
                        ]
                    });
                }
            }

            if (interaction.customId === "ticket_actions") {
                const action = interaction.values[0];
                const thread = interaction.channel;

                if (!thread.isThread()) return;

                const ticketId = thread.name.replace("ticket-", "");
                const ticketData = getTicketData(ticketId);

                if (action === "ping_staff") {
                    return interaction.reply({
                        content: "🔔 Un usuario necesita ayuda en este ticket.",
                        allowedMentions: { parse: ["everyone"] }
                    });
                }

                if (action === "close") {
                    // Mostrar modal para motivo de cierre y notas
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_close_modal_${ticketId}`)
                        .setTitle("Cerrar Ticket");
                    
                    const closeReasonInput = new TextInputBuilder()
                        .setCustomId("close_reason")
                        .setLabel("Motivo de cierre")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Problema resuelto, spam, etc.")
                        .setRequired(true);
                    
                    const extraNotesInput = new TextInputBuilder()
                        .setCustomId("extra_notes")
                        .setLabel("Notas extra (opcional)")
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder("Información adicional...")
                        .setRequired(false);
                    
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(closeReasonInput),
                        new ActionRowBuilder().addComponents(extraNotesInput)
                    );
                    
                    return interaction.showModal(modal);
                }

                if (action === "delete") {
                    await interaction.reply({ content: "🗑️ Eliminando ticket...", ephemeral: true });
                    // No borramos el JSON, solo el hilo
                    await thread.delete();
                    return;
                }

                if (action === "archive") {
                    await thread.setArchived(true, "Ticket archivado");
                    return interaction.reply({ content: "📦 Ticket archivado.", ephemeral: true });
                }
            }
        },

        // Handler para el modal de cierre
        async handleModalSubmit(interaction) {
            const customId = interaction.customId;
            if (!customId.startsWith("ticket_close_modal_")) return;
            
            const ticketId = customId.replace("ticket_close_modal_", "");
            const thread = interaction.channel;
            const ticketData = getTicketData(ticketId) || { ticketId, userId: "Desconocido", type: "otro", reason: "N/A", userTag: "Desconocido" };
            
            const closeReason = interaction.fields.getTextInputValue("close_reason");
            const extraNotes = interaction.fields.getTextInputValue("extra_notes") || "";
            
            await interaction.deferReply({ ephemeral: true });
            
            // 1. Recolectar historial de chat
            const chatHistory = await collectChatHistory(thread);
            
            // 2. Actualizar JSON con historial completo
            const port = parseInt(process.env.PORT || "3000", 10);
            const baseUrl = process.env.PUBLIC_URL || resolvePublicBaseUrl(port);
            const ticketUrl = `${baseUrl}/bot/tickets/${ticketId}.json`;
            
            const fullTicketData = {
                ...ticketData,
                status: "closed",
                closedAt: new Date().toISOString(),
                closedBy: {
                    id: interaction.user.id,
                    tag: interaction.user.tag
                },
                closeReason,
                extraNotes,
                chatHistory,
                attachments: chatHistory.flatMap(msg => msg.attachments),
                ticketUrl,
                messageCount: chatHistory.length
            };
            
            saveTicketData(ticketId, fullTicketData);
            
            // 3. Crear embed de cierre
            const closedEmbed = createClosedEmbed(
                ticketData.ticketId,
                `<@${ticketData.userId}>`,
                ticketData.type,
                ticketData.reason,
                closeReason,
                `<@${interaction.user.id}>`
            );
            
            await thread.send({ embeds: [closedEmbed] });
            
            // 4. Enviar URL al JSON al usuario
            try {
                const user = await interaction.client.users.fetch(ticketData.userId);
                
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`📋 Ticket #${ticketId} — Cerrado`)
                    .setDescription(
                        `Tu ticket ha sido cerrado.\n\n` +
                        `**Motivo:** ${closeReason}\n` +
                        `**Cerrado por:** <@${interaction.user.id}>\n\n` +
                        `Puedes ver el historial completo en el enlace de abajo.`
                    )
                    .setColor(TICKET_COLORS.closed)
                    .setTimestamp();
                
                const urlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(ticketUrl)
                        .setLabel("📄 Ver historial del ticket")
                        .setEmoji("📋")
                );
                
                await user.send({ embeds: [dmEmbed], components: [urlRow] });
            } catch {
                // El usuario puede tener DMs bloqueados
            }
            
            // 5. Enviar mensaje en el hilo con el link
            const linkEmbed = new EmbedBuilder()
                .setTitle("📋 Historial guardado")
                .setDescription(`El historial de este ticket está disponible en:\n${ticketUrl}`)
                .setColor(TICKET_COLORS.closed)
                .setFooter({ text: "Este enlace estará activo mientras el bot esté en línea." });
            
            const linkRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(ticketUrl)
                    .setLabel("Ver ticket completo")
                    .setEmoji("🔗")
            );
            
            await thread.send({ embeds: [linkEmbed], components: [linkRow] });
            
            // 6. Crear post en foro de staff
            await createTicketReport(interaction, ticketData, chatHistory, closeReason, extraNotes);
            
            // 7. Archivar el hilo
            await thread.setArchived(true, "Ticket cerrado");
            
            await interaction.editReply({ content: "✅ Ticket cerrado. Historial guardado y reporte creado." });
        }
    }
];
