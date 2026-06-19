import { SlashCommandBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

const SYSTEM_PROMPT = "Eres un asistente útil, amigable y conciso. Responde en el mismo idioma que el usuario. Si no sabes algo, di la verdad.";

async function queryAI(prompt, systemOverride) {
    let provider = (process.env.PROVIDER || process.env.AI_PROVIDER || "mistral").toLowerCase().trim();
    if (provider === "minstral") provider = "mistral";

    const apiKey = (process.env.api || process.env.api_key || process.env.API_KEY || "").trim();
    const model = (process.env.AI_MODEL || "").trim();
    const system = systemOverride || SYSTEM_PROMPT;

    if (!apiKey) {
        return `${Emojis.prohibicion} **Error:** La clave de API (\`API_KEY\` en secrets/.env) no está configurada.`;
    }

    try {
        // ── OpenAI / ChatGPT ────────────────────────────────────
        if (provider === "openai" || provider === "chatgpt") {
            const r = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "gpt-4o-mini",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **OpenAI (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        // ── Mistral AI ──────────────────────────────────────────
        } else if (provider === "mistral") {
            const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "open-mistral-7b",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **Mistral (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        // ── Google Gemini ───────────────────────────────────────
        } else if (provider === "gemini" || provider === "google") {
            const m = model || "gemini-2.0-flash";
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${system}\n\nUsuario: ${prompt}` }] }]
                })
            });
            if (!r.ok) return `❌ **Gemini (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";

        // ── DeepSeek ────────────────────────────────────────────
        } else if (provider === "deepseek") {
            const r = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "deepseek-chat",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **DeepSeek (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        // ── Groq (Llama 3, Mixtral, etc.) ──────────────────────
        } else if (provider === "groq") {
            const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "llama-3.1-8b-instant",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
                    max_tokens: 2048
                })
            });
            if (!r.ok) return `❌ **Groq (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        // ── HuggingFace Inference API (gratuito) ────────────────
        } else if (provider === "huggingface" || provider === "hf") {
            const m = model || "meta-llama/Llama-3.1-8B-Instruct";
            const r = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${system}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
                    parameters: { max_new_tokens: 2048, temperature: 0.7 }
                })
            });
            if (!r.ok) return `❌ **HuggingFace (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            return text || "Sin respuesta.";

        // ── Together AI ─────────────────────────────────────────
        } else if (provider === "together") {
            const r = await fetch("https://api.together.xyz/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "meta-llama/Llama-3-8b-chat-hf",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **Together (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        // ── Anthropic Claude ────────────────────────────────────
        } else if (provider === "anthropic" || provider === "claude") {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({
                    model: model || "claude-3-5-haiku-20241022",
                    max_tokens: 2048,
                    system: system,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **Anthropic (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.content?.[0]?.text || "Sin respuesta.";

        // ── OpenCode (gratuito, sin API key) ────────────────────
        } else if (provider === "opencode") {
            const r = await fetch("https://opencode-ai.vercel.app/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: model || "gpt-4o-mini"
                })
            });
            if (!r.ok) return `❌ **OpenCode (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.choices?.[0]?.message?.content || data.content || data.response || "Sin respuesta.";

        // ── LiteLLM / Proxy personalizado ───────────────────────
        } else if (provider === "litellm" || provider === "proxy") {
            const baseUrl = (process.env.AI_BASE_URL || "").trim();
            if (!baseUrl) return "❌ **Error:** `AI_BASE_URL` no está configurado para LiteLLM/Proxy.";
            const r = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: model || "gpt-4o-mini",
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **LiteLLM (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).choices?.[0]?.message?.content || "Sin respuesta.";

        } else {
            const providers = ["openai", "mistral", "gemini", "deepseek", "groq", "huggingface", "together", "anthropic", "opencode", "litellm"];
            return `${Emojis.prohibicion} **Proveedor \`${provider}\` no soportado.**\n\nProveedores disponibles:\n${providers.map(p => `\`${p}\``).join(", ")}`;
        }
    } catch (error) {
        return `${Emojis.wecantconect} **Error de conexión:** ${error.message}`;
    }
}

async function sendLongSlashResponse(interaction, text) {
    if (text.length <= 2000) return await interaction.editReply(text);
    const chunks = [];
    let current = text;
    while (current.length > 0) {
        chunks.push(current.substring(0, 1900));
        current = current.substring(1900);
    }
    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
        await interaction.channel.send(chunks[i]);
    }
}

export const aiCommands = [
    {
        name: "ask",
        description: "Hazle una pregunta al modelo de IA configurado.",
        category: "general",
        aliases: ["preguntar", "ia"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("pregunta").setDescription("Tu pregunta").setRequired(true));
        },
        async executeSlash(interaction) {
            const prompt = interaction.options.getString("pregunta");
            await interaction.deferReply();
            const answer = await queryAI(prompt);
            await sendLongSlashResponse(interaction, answer);
        },
        async executePrefix(message, args) {
            const prompt = args.join(" ");
            if (!prompt) return message.reply("❌ Escribe tu pregunta.");
            const statusMsg = await message.reply("🤔 Procesando...");
            const answer = await queryAI(prompt);
            if (answer.length <= 2000) return await statusMsg.edit(answer);
            await statusMsg.edit(answer.substring(0, 2000));
            let rest = answer.substring(2000);
            while (rest.length > 0) {
                await message.channel.send(rest.substring(0, 1900));
                rest = rest.substring(1900);
            }
        }
    },
    {
        name: "ai-provider",
        description: "Muestra el proveedor de IA configurado o cámbialo.",
        category: "general",
        aliases: ["aiprovider", "provider"],
        slashBuilder() {
            return new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption(o => o.setName("nuevo").setDescription("Nuevo proveedor"));
        },
        async executeSlash(interaction) {
            const nuevo = interaction.options.getString("nuevo");
            if (nuevo) {
                process.env.PROVIDER = nuevo.toLowerCase();
                return interaction.reply({ content: `✅ Proveedor cambiado a **${nuevo}**`, ephemeral: true });
            }
            const current = (process.env.PROVIDER || process.env.AI_PROVIDER || "mistral").toLowerCase();
            const providers = ["openai", "mistral", "gemini", "deepseek", "groq", "huggingface", "together", "anthropic", "opencode", "litellm"];
            await interaction.reply({ content: `🤖 Proveedor actual: **${current}**\n\nDisponibles: ${providers.map(p => `\`${p}\``).join(", ")}`, ephemeral: true });
        },
        async executePrefix(message, args) {
            if (args[0]) {
                process.env.PROVIDER = args[0].toLowerCase();
                return message.reply(`✅ Proveedor cambiado a **${args[0]}**`);
            }
            const current = (process.env.PROVIDER || process.env.AI_PROVIDER || "mistral").toLowerCase();
            const providers = ["openai", "mistral", "gemini", "deepseek", "groq", "huggingface", "together", "anthropic", "opencode", "litellm"];
            message.reply(`🤖 Proveedor actual: **${current}**\n\nDisponibles: ${providers.map(p => `\`${p}\``).join(", ")}`);
        }
    }
];
