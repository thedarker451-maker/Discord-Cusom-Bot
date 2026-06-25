import db from "./database.js";

export function startTempbanWorker(client) {
    // Ejecutar cada 30 segundos
    setInterval(async () => {
        try {
            const guilds = client.guilds.cache;
            for (const [guildId, guild] of guilds) {
                const tempbansKey = `tempbans:${guildId}`;
                const tempbans = await db.get(tempbansKey, []);
                if (!tempbans || tempbans.length === 0) continue;

                const now = Date.now();
                const expired = tempbans.filter(b => b.expires <= now);
                const active = tempbans.filter(b => b.expires > now);

                if (expired.length > 0) {
                    // Actualizar la lista en la base de datos con los bans activos restantes
                    await db.set(tempbansKey, active);

                    for (const ban of expired) {
                        try {
                            // Validar si el usuario sigue baneado antes de intentar removerlo
                            const bans = await guild.bans.fetch().catch(() => null);
                            if (bans && bans.has(ban.userId)) {
                                await guild.members.unban(ban.userId, "Expiración de ban temporal (Tempban)");
                                console.log(`[+] Desbaneado automáticamente usuario ID ${ban.userId} en ${guild.name} por expiración de tempban.`);
                                
                                // Opcional: Registrar en modlogs la expiración
                                const caseId = await db.addCase(guildId, {
                                    type: "unban",
                                    targetId: ban.userId,
                                    moderatorId: client.user.id,
                                    reason: "Expiración automática de ban temporal"
                                });

                                const settings = await db.getSettings(guildId);
                                if (settings.logChannel) {
                                    const logCh = guild.channels.cache.get(settings.logChannel);
                                    if (logCh) {
                                        const user = await client.users.fetch(ban.userId).catch(() => null);
                                        const embed = new (await import("discord.js")).EmbedBuilder()
                                            .setAuthor({ name: `[CASO #${caseId}] UNBAN (AUTOMÁTICO)`, iconURL: user ? user.displayAvatarURL() : client.user.displayAvatarURL() })
                                            .setColor("#10B981")
                                            .addFields(
                                                { name: "Usuario", value: user ? `${user} (\`${ban.userId}\`)` : `\`${ban.userId}\``, inline: true },
                                                { name: "Detalle", value: "Expiración automática de ban temporal", inline: true }
                                            )
                                            .setTimestamp();
                                        await logCh.send({ embeds: [embed] }).catch(() => {});
                                    }
                                }
                            }
                        } catch (banErr) {
                            console.error(`[!] Error al desbanear al usuario ${ban.userId} en ${guild.name}:`, banErr.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("[!] Error en el worker de tempbans:", err.message);
        }
    }, 30000);
}
