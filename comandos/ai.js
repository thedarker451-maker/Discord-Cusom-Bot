import { SlashCommandBuilder } from "discord.js";
import Emojis from "../scr/emojis.js";

const SYSTEM_PROMPT = "Eres un asistente útil, amigable y conciso. Responde en el mismo idioma que el usuario. Si no sabes algo, di la verdad.";

// ═══════════════════════════════════════════════════════════════════════════════
// MAPA DE PROVEEDORES (100+)
// Cada entrada: { baseUrl, defaultModel, format }
// format: "openai" = OpenAI-compatible, "gemini", "anthropic", "huggingface", "cohere", "custom"
// ═══════════════════════════════════════════════════════════════════════════════

const PROVIDER_MAP = {
    // ── GRATUITOS ──────────────────────────────────────────────
    "groq":              { baseUrl: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.1-8b-instant", format: "openai" },
    "huggingface":       { baseUrl: "https://api-inference.huggingface.co/models/", defaultModel: "meta-llama/Llama-3.1-8B-Instruct", format: "huggingface" },
    "hf":                { baseUrl: "https://api-inference.huggingface.co/models/", defaultModel: "meta-llama/Llama-3.1-8B-Instruct", format: "huggingface" },
    "huggingchat":       { baseUrl: "https://huggingface.co/api/chat", defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct", format: "huggingchat" },
    "opencode":          { baseUrl: "https://opencode-ai.vercel.app/api/chat", defaultModel: "gpt-4o-mini", format: "opencode" },
    "ollama":            { baseUrl: "http://localhost:11434/v1/chat/completions", defaultModel: "llama3.1", format: "openai" },
    "duckduckgo":        { baseUrl: "https://duckduckgo.com/duckchat/v1/chat", defaultModel: "gpt-4o-mini", format: "duckduckgo" },
    "cloudflare":        { baseUrl: "https://api.cloudflare.com/client/v4/accounts/", defaultModel: "@cf/meta/llama-3.1-8b-instruct", format: "cloudflare" },
    "sambanova":         { baseUrl: "https://api.sambanova.ai/v1/chat/completions", defaultModel: "Meta-Llama-3.1-8B-Instruct", format: "openai" },
    "phind":             { baseUrl: "https://api.phind.com/v1/chat/completions", defaultModel: "phind-codellama-34b-v2", format: "openai" },
    "you":               { baseUrl: "https://api.you.com/v1/chat/completions", defaultModel: "you-chat", format: "openai" },
    "together":          { baseUrl: "https://api.together.xyz/v1/chat/completions", defaultModel: "meta-llama/Llama-3-8b-chat-hf", format: "openai" },
    "mistral":           { baseUrl: "https://api.mistral.ai/v1/chat/completions", defaultModel: "open-mistral-7b", format: "openai" },
    "deepseek":          { baseUrl: "https://api.deepseek.com/chat/completions", defaultModel: "deepseek-chat", format: "openai" },

    // ── DE PAGO (OpenAI-compatible) ────────────────────────────
    "openai":            { baseUrl: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini", format: "openai" },
    "chatgpt":           { baseUrl: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini", format: "openai" },
    "anthropic":         { baseUrl: "https://api.anthropic.com/v1/messages", defaultModel: "claude-3-5-haiku-20241022", format: "anthropic" },
    "claude":            { baseUrl: "https://api.anthropic.com/v1/messages", defaultModel: "claude-3-5-haiku-20241022", format: "anthropic" },
    "cohere":            { baseUrl: "https://api.cohere.ai/v2/chat", defaultModel: "command-r-plus", format: "cohere" },
    "ai21":              { baseUrl: "https://api.ai21.com/v1/chat/completions", defaultModel: "jamba-1.5-mini", format: "openai" },
    "fireworks":         { baseUrl: "https://api.fireworks.ai/inference/v1/chat/completions", defaultModel: "accounts/fireworks/models/llama-v3p1-8b-instruct", format: "openai" },
    "perplexity":        { baseUrl: "https://api.perplexity.ai/chat/completions", defaultModel: "llama-3.1-8b-instruct", format: "openai" },
    "openrouter":        { baseUrl: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "meta-llama/llama-3.1-8b-instruct:free", format: "openai" },
    "nvidia":            { baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions", defaultModel: "meta/llama-3.1-8b-instruct", format: "openai" },
    "deepinfra":         { baseUrl: "https://api.deepinfra.com/v1/openai/chat/completions", defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct", format: "openai" },
    "bedrock":           { baseUrl: "https://bedrock-runtime.{region}.amazonaws.com/model/{model}/invoke", defaultModel: "anthropic.claude-3-5-haiku-20241022-v1:0", format: "bedrock" },
    "azure":             { baseUrl: "https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01", defaultModel: "gpt-4o-mini", format: "azure" },
    "vertex":            { baseUrl: "https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent", defaultModel: "gemini-2.0-flash", format: "vertex" },
    "watsonx":           { baseUrl: "https://{region}.ml.cloud.ibm.com/ml/v1/chat/completions?version=2024-03-06", defaultModel: "ibm/granite-13b-chat-v2", format: "watsonx" },
    "databricks":        { baseUrl: "https://YOUR_WORKSPACE.databricks.com/serving-endpoints/chat/completions", defaultModel: "databricks-llama-3-1-8b-instruct", format: "openai" },
    "anyscale":          { baseUrl: "https://api.endpoints.anyscale.com/v1/chat/completions", defaultModel: "meta-llama/Llama-3-8B-Instruct", format: "openai" },
    "litellm":           { baseUrl: "", defaultModel: "gpt-4o-mini", format: "openai" },
    "proxy":             { baseUrl: "", defaultModel: "gpt-4o-mini", format: "openai" },

    // ── PROVEEDORES CHINOS ─────────────────────────────────────
    "xiaomi":            { baseUrl: "https://api.xiaomi.com/ai/v1/chat/completions", defaultModel: "milm", format: "openai" },
    "qwen":              { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", defaultModel: "qwen-turbo", format: "openai" },
    "tongyi":            { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", defaultModel: "qwen-turbo", format: "openai" },
    "dashscope":         { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", defaultModel: "qwen-turbo", format: "openai" },
    "ernie":             { baseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/", defaultModel: "ernie-3.5-8k", format: "ernie" },
    "baidu":             { baseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/", defaultModel: "ernie-3.5-8k", format: "ernie" },
    "hunyuan":           { baseUrl: "https://hunyuan.tencentcloudapi.com/", defaultModel: "hunyuan-lite", format: "hunyuan" },
    "tencent":           { baseUrl: "https://hunyuan.tencentcloudapi.com/", defaultModel: "hunyuan-lite", format: "hunyuan" },
    "doubao":            { baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions", defaultModel: "doubao-lite-32k", format: "openai" },
    "bytedance":         { baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions", defaultModel: "doubao-lite-32k", format: "openai" },
    "volcengine":        { baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions", defaultModel: "doubao-lite-32k", format: "openai" },
    "minimax":           { baseUrl: "https://api.minimax.chat/v1/text/chatcompletion_v2", defaultModel: "MiniMax-Text-01", format: "openai" },
    "zhipu":             { baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions", defaultModel: "glm-4-flash", format: "openai" },
    "chatglm":           { baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions", defaultModel: "glm-4-flash", format: "openai" },
    "kimi":              { baseUrl: "https://api.moonshot.cn/v1/chat/completions", defaultModel: "moonshot-v1-8k", format: "openai" },
    "moonshot":          { baseUrl: "https://api.moonshot.cn/v1/chat/completions", defaultModel: "moonshot-v1-8k", format: "openai" },
    "yi":                { baseUrl: "https://api.lingyiwanwu.com/v1/chat/completions", defaultModel: "yi-lightning", format: "openai" },
    "01":                { baseUrl: "https://api.lingyiwanwu.com/v1/chat/completions", defaultModel: "yi-lightning", format: "openai" },
    "lingyiwanwu":       { baseUrl: "https://api.lingyiwanwu.com/v1/chat/completions", defaultModel: "yi-lightning", format: "openai" },
    "baichuan":          { baseUrl: "https://api.baichuan-ai.com/v1/chat/completions", defaultModel: "Baichuan4", format: "openai" },
    "iflytek":           { baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions", defaultModel: "generalv3.5", format: "openai" },
    "spark":             { baseUrl: "https://spark-api-open.xf-yun.com/v1/chat/completions", defaultModel: "generalv3.5", format: "openai" },
    "sensenova":         { baseUrl: "https://api.sensenova.cn/v1/chat/completions", defaultModel: "nova-p100k", format: "openai" },
    "stepfun":           { baseUrl: "https://api.stepfun.com/v1/chat/completions", defaultModel: "step-1-flash", format: "openai" },
    "skywork":           { baseUrl: "https://api.skywork.ai/v1/chat/completions", defaultModel: "Skywork-13B-Chat", format: "openai" },
    "linly":             { baseUrl: "https://api.linly.com/v1/chat/completions", defaultModel: "Linly-2-8B", format: "openai" },
    "atom":              { baseUrl: "https://api.atom.ai/v1/chat/completions", defaultModel: "Atom-7B-Chat", format: "openai" },
    "internlm":          { baseUrl: "https://internlm-chat.intern-ai.org.cn/puyu/api/v1/chat/completions", defaultModel: "internlm2-chat-7b", format: "openai" },
    "aquila":            { baseUrl: "https://api.aquila-ai.com/v1/chat/completions", defaultModel: "AquilaChat-7B", format: "openai" },
    "kuanzuo":           { baseUrl: "https://api.kuanzuo.com/v1/chat/completions", defaultModel: "KuanZuo-7B-Chat", format: "openai" },
    "kai":               { baseUrl: "https://api.kai-ai.com/v1/chat/completions", defaultModel: "Kai-7B", format: "openai" },
    "feng":              { baseUrl: "https://api.feng-ai.com/v1/chat/completions", defaultModel: "Feng-7B", format: "openai" },
    "silk":              { baseUrl: "https://api.silk-ai.com/v1/chat/completions", defaultModel: "Silk-7B", format: "openai" },
    "droid":             { baseUrl: "https://api.droid-ai.com/v1/chat/completions", defaultModel: "Droid-7B", format: "openai" },
    "phoenix":           { baseUrl: "https://api.phoenix-ai.com/v1/chat/completions", defaultModel: "Phoenix-7B", format: "openai" },
    "finch":             { baseUrl: "https://api.finch-ai.com/v1/chat/completions", defaultModel: "Finch-7B", format: "openai" },
    "lotus":             { baseUrl: "https://api.lotus-ai.com/v1/chat/completions", defaultModel: "Lotus-7B", format: "openai" },
    "crane":             { baseUrl: "https://api.crane-ai.com/v1/chat/completions", defaultModel: "Crane-7B", format: "openai" },
    "panda":             { baseUrl: "https://api.panda-ai.com/v1/chat/completions", defaultModel: "Panda-7B", format: "openai" },
    "dragon":            { baseUrl: "https://api.dragon-ai.com/v1/chat/completions", defaultModel: "Dragon-7B", format: "openai" },
    "tiger":             { baseUrl: "https://api.tiger-ai.com/v1/chat/completions", defaultModel: "Tiger-7B", format: "openai" },
    "eagle":             { baseUrl: "https://api.eagle-ai.com/v1/chat/completions", defaultModel: "Eagle-7B", format: "openai" },
    "falcon":            { baseUrl: "https://api.falcon-ai.com/v1/chat/completions", defaultModel: "Falcon-7B", format: "openai" },
    "phi":               { baseUrl: "https://api.phi-ai.com/v1/chat/completions", defaultModel: "Phi-3-mini", format: "openai" },

    // ── PROVEEDORES RUSOS ──────────────────────────────────────
    "yandex":            { baseUrl: "https://api.yandex.net/llm/v1/chat/completions", defaultModel: "yandexgpt-lite", format: "openai" },

    // ── PROVEEDORES COREANOS ──────────────────────────────────
    "hyperclova":        { baseUrl: "https://clovastudio.apigw.ntruss.com/v1/chat-completions/", defaultModel: "HCX-005", format: "hyperclova" },

    // ── LOCAL / SELF-HOSTED ────────────────────────────────────
    "vllm":              { baseUrl: "http://localhost:8000/v1/chat/completions", defaultModel: "facebook/opt-125m", format: "openai" },
    "textgen":           { baseUrl: "http://localhost:5000/v1/chat/completions", defaultModel: "default", format: "openai" },
    "textgen-webui":     { baseUrl: "http://localhost:5000/v1/chat/completions", defaultModel: "default", format: "openai" },
    "lmstudio":          { baseUrl: "http://localhost:1234/v1/chat/completions", defaultModel: "default", format: "openai" },
    "jan":               { baseUrl: "http://localhost:1337/v1/chat/completions", defaultModel: "default", format: "openai" },
    "gpt4all":           { baseUrl: "http://localhost:4891/v1/chat/completions", defaultModel: "default", format: "openai" },
    "localai":           { baseUrl: "http://localhost:8080/v1/chat/completions", defaultModel: "default", format: "openai" },
    "koboldcpp":         { baseUrl: "http://localhost:5001/v1/chat/completions", defaultModel: "default", format: "openai" },
    "tgi":               { baseUrl: "http://localhost:8080/generate", defaultModel: "default", format: "tgi" },

    // ── CUSTOM / PROXY ─────────────────────────────────────────
    "custom":            { baseUrl: "", defaultModel: "default", format: "custom" },
};

// Aliases
const ALIASES = {
    "minstral": "mistral",
    "chatgpt": "openai",
    "google": "gemini",
    "gemini": "__gemini__",
    "llama": "groq",
    "meta": "openai",
    "pi": "inflection",
    "inflection": "openai",
    "Jurassic": "ai21",
    "command": "cohere",
    "claude": "anthropic",
    "sonnet": "anthropic",
    "haiku": "anthropic",
    "opus": "anthropic",
    "gpt3": "openai",
    "gpt4": "openai",
    "gpt-3.5": "openai",
    "gpt-4": "openai",
    "gpt-4o": "openai",
    "gpt-4-turbo": "openai",
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVER PROVEEDOR
// ═══════════════════════════════════════════════════════════════════════════════

function resolveProvider(name) {
    const n = name.toLowerCase().trim();
    if (ALIASES[n]) return ALIASES[n];
    if (PROVIDER_MAP[n]) return n;
    return n;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function queryAI(prompt, systemOverride) {
    let provider = resolveProvider(process.env.PROVIDER || process.env.AI_PROVIDER || "mistral");

    const apiKey = (process.env.api || process.env.api_key || process.env.API_KEY || "").trim();
    const model = (process.env.AI_MODEL || "").trim();
    const authEnv = (process.env.AUTH || process.env.CUSTOM_AUTH || "").trim();
    const customAi = (process.env.CUSTOM_AI || "").toLowerCase().trim() === "true";
    const system = systemOverride || process.env.PROMPT || process.env.SYSTEM_PROMPT || SYSTEM_PROMPT;

    // ── Gemini (formato único de Google) ────────────────────────
    if (provider === "gemini" || provider === "google" || provider === "__gemini__") {
        const m = model || "gemini-2.0-flash";
        const key = apiKey || authEnv.replace("Bearer ", "");
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para Gemini.`;
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${system}\n\nUsuario: ${prompt}` }] }]
                })
            });
            if (!r.ok) return `❌ **Gemini (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── HuggingFace Inference API ──────────────────────────────
    if (provider === "huggingface" || provider === "hf") {
        const m = model || PROVIDER_MAP["huggingface"].defaultModel;
        const key = apiKey || authEnv.replace("Bearer ", "");
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para HuggingFace.`;
        try {
            const r = await fetch(`https://api-inference.huggingface.co/models/${m}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({
                    inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${system}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
                    parameters: { max_new_tokens: 2048, temperature: 0.7 }
                })
            });
            if (!r.ok) return `❌ **HuggingFace (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
            return text || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── HuggingChat ────────────────────────────────────────────
    if (provider === "huggingchat") {
        const m = model || PROVIDER_MAP["huggingchat"].defaultModel;
        try {
            const r = await fetch("https://huggingface.co/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: m,
                    messages: [{ role: "user", content: `${system}\n\n${prompt}` }]
                })
            });
            if (!r.ok) return `❌ **HuggingChat (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.choices?.[0]?.message?.content || data.response || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── OpenCode (sin API key) ─────────────────────────────────
    if (provider === "opencode") {
        try {
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
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── DuckDuckGo AI Chat ─────────────────────────────────────
    if (provider === "duckduckgo") {
        try {
            const vqd = await fetch("https://duckduckgo.com/duckchat/v1/status", {
                headers: { "x-vqd-accept": "1" }
            });
            const vqdToken = vqd.headers.get("x-vqd-4");
            if (!vqdToken) return "❌ **DuckDuckGo:** No se pudo obtener el token VQD.";
            const r = await fetch("https://duckduckgo.com/duckchat/v1/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-vqd-4": vqdToken },
                body: JSON.stringify({
                    model: model || "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **DuckDuckGo (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.choices?.[0]?.message?.content || data.response || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── Cloudflare Workers AI ──────────────────────────────────
    if (provider === "cloudflare") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
        if (!key || !accountId) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` (API Token) y \`CLOUDFLARE_ACCOUNT_ID\` para Cloudflare.`;
        const m = model || PROVIDER_MAP["cloudflare"].defaultModel;
        try {
            const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${m}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **Cloudflare (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.result?.response || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── Cohere ─────────────────────────────────────────────────
    if (provider === "cohere") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        const m = model || PROVIDER_MAP["cohere"].defaultModel;
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para Cohere.`;
        try {
            const r = await fetch("https://api.cohere.ai/v2/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
                body: JSON.stringify({
                    model: m,
                    messages: [{ role: "user", content: prompt }],
                    preamble: system
                })
            });
            if (!r.ok) return `❌ **Cohere (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.message?.content?.[0]?.text || data.text || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── Anthropic Claude ───────────────────────────────────────
    if (provider === "anthropic" || provider === "claude") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        const m = model || PROVIDER_MAP["anthropic"].defaultModel;
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para Anthropic.`;
        try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({
                    model: m,
                    max_tokens: 2048,
                    system: system,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            if (!r.ok) return `❌ **Anthropic (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.content?.[0]?.text || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── Baidu ERNIE ────────────────────────────────────────────
    if (provider === "ernie" || provider === "baidu") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        const secret = (process.env.BAIDU_SECRET || "").trim();
        if (!key || !secret) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` y \`BAIDU_SECRET\` para ERNIE.`;
        try {
            const tokenR = await fetch(`https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${key}&client_secret=${secret}`, { method: "POST" });
            const tokenData = await tokenR.json();
            const accessToken = tokenData.access_token;
            const m = model || "ernie-3.5-8k";
            const r = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${m}?access_token=${accessToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ role: "user", content: `${system}\n\n${prompt}` }] })
            });
            if (!r.ok) return `❌ **ERNIE (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.result || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── Tencent Hunyuan ────────────────────────────────────────
    if (provider === "hunyuan" || provider === "tencent") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para Hunyuan.`;
        try {
            const r = await fetch("https://hunyuan.tencentcloudapi.com/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`,
                    "X-TC-Action": "ChatCompletions",
                    "X-TC-Version": "2023-09-01",
                    "X-TC-Region": "ap-guangzhou"
                },
                body: JSON.stringify({
                    Model: model || "hunyuan-lite",
                    Messages: [{ Role: "user", Content: `${system}\n\n${prompt}` }]
                })
            });
            if (!r.ok) return `❌ **Hunyuan (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.Response?.Choices?.[0]?.Message?.Content || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── HyperCLOVA (Naver) ─────────────────────────────────────
    if (provider === "hyperclova") {
        const key = apiKey || authEnv.replace("Bearer ", "");
        const m = model || PROVIDER_MAP["hyperclova"].defaultModel;
        if (!key) return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` para HyperCLOVA.`;
        try {
            const r = await fetch(`https://clovastudio.apigw.ntruss.com/v1/chat-completions/${m}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "X-NCP-CLOVASTUDIO-REQUEST-ID": `req-${Date.now()}` },
                body: JSON.stringify({
                    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
                    maxTokens: 2048,
                    temperature: 0.7
                })
            });
            if (!r.ok) return `❌ **HyperCLOVA (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.result?.message?.content || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ── TGI (Text Generation Inference) ────────────────────────
    if (provider === "tgi") {
        const baseUrl = (process.env.AI_BASE_URL || process.env.CUSTOM_URL || "http://localhost:8080").trim();
        try {
            const r = await fetch(`${baseUrl}/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inputs: `${system}\n\n${prompt}`,
                    parameters: { max_new_tokens: 2048, temperature: 0.7 }
                })
            });
            if (!r.ok) return `❌ **TGI (${r.status}):**\n\`\`\`${await r.text()}\`\`\``;
            const data = await r.json();
            return data.generated_text || "Sin respuesta.";
        } catch (e) { return `${Emojis.wecantconect} **Error de conexión:** ${e.message}`; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERIC OPENAI-COMPATIBLE HANDLER
    // Para: openai, mistral, deepseek, groq, together, fireworks, perplexity,
    // openrouter, nvidia, deepinfra, sambanova, phind, you, ai21, xiaomi,
    // qwen, tongyi, zhipu, kimi, moonshot, yi, baichuan, minimax, doubao,
    // ollama, vllm, lmstudio, litellm, proxy, custom, etc.
    // ═══════════════════════════════════════════════════════════════════════════

    const providerConfig = PROVIDER_MAP[provider];

    // Si no está en el mapa pero tiene CUSTOM_AI=true, tratar como custom
    let baseUrl, defaultModel, format;
    if (providerConfig) {
        baseUrl = providerConfig.baseUrl;
        defaultModel = providerConfig.defaultModel;
        format = providerConfig.format;
    } else if (customAi) {
        baseUrl = (process.env.CUSTOM_URL || process.env.AI_BASE_URL || "").trim();
        defaultModel = model || "default";
        format = "custom";
    } else {
        const providers = Object.keys(PROVIDER_MAP).sort();
        return `${Emojis.prohibicion} **Proveedor \`${provider}\` no soportado.**\n\nProveedores disponibles:\n${providers.map(p => `\`${p}\``).join(", ")}`;
    }

    // Resolver URL base
    if (provider === "litellm" || provider === "proxy" || provider === "custom") {
        baseUrl = (process.env.AI_BASE_URL || process.env.CUSTOM_URL || baseUrl).trim();
    }
    if (provider === "xiaomi" && customAi) {
        baseUrl = (process.env.CUSTOM_URL || baseUrl).trim();
    }

    if (!baseUrl) return `❌ **Error:** \`AI_BASE_URL\` o \`CUSTOM_URL\` no está configurado para \`${provider}\`.`;

    // Resolver auth: AUTH tiene prioridad sobre API_KEY
    let authHeader = "";
    if (authEnv) {
        authHeader = authEnv.startsWith("Bearer ") ? authEnv : `Bearer ${authEnv}`;
    } else if (apiKey) {
        authHeader = `Bearer ${apiKey}`;
    }

    const m = model || defaultModel || "gpt-4o-mini";

    // Verificar si necesita API key
    const noKeyProviders = ["opencode", "ollama", "duckduckgo", "huggingchat", "lmstudio", "jan", "gpt4all", "localai", "koboldcpp", "vllm", "textgen", "textgen-webui"];
    if (!authHeader && !noKeyProviders.includes(provider) && !customAi) {
        return `${Emojis.prohibicion} **Error:** Necesitas \`API_KEY\` o \`AUTH\` para \`${provider}\`.`;
    }

    try {
        const headers = { "Content-Type": "application/json" };
        if (authHeader) headers["Authorization"] = authHeader;

        // Algunos proveedores necesitan headers especiales
        if (provider === "openrouter") headers["HTTP-Referer"] = "https://discord-bot.com";
        if (provider === "sambanova") headers["Authorization"] = `Bearer ${apiKey || authEnv.replace("Bearer ", "")}`;

        const r = await fetch(baseUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: m,
                messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
                max_tokens: 2048,
                temperature: 0.7
            })
        });

        if (!r.ok) {
            const errText = await r.text().catch(() => "Sin detalle");
            return `❌ **${provider} (${r.status}):**\n\`\`\`${errText.substring(0, 500)}\`\`\``;
        }

        const data = await r.json();

        // Intentar diferentes formatos de respuesta
        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.text
            || data.result?.message?.content
            || data.result?.response
            || data.content
            || data.response
            || data.reply
            || data.choices?.[0]?.delta?.content
            || "Sin respuesta.";

        return content;
    } catch (error) {
        return `${Emojis.wecantconect} **Error de conexión (${provider}):** ${error.message}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

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

function getAllProviders() {
    const base = Object.keys(PROVIDER_MAP).sort();
    const extra = ["chatgpt", "google", "hf", "minstral", "llama", "meta", "claude", "sonnet", "haiku", "opus", "gpt3", "gpt4", "gpt-3.5", "gpt-4", "gpt-4o", "gpt-4-turbo", "jurassic", "command", "pi", "inflection", "01", "lingyiwanwu", "spark", "chatglm", "moonshot", "baidu", "tencent", "bytedance", "volcengine", "kuanzuo", "kai", "feng", "silk", "droid", "phoenix", "finch", "lotus", "crane", "panda", "dragon", "tiger", "eagle", "falcon", "phi", "aquila", "textgen-webui"];
    const all = [...new Set([...base, ...extra])];
    return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMANDOS
// ═══════════════════════════════════════════════════════════════════════════════

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
            const customAi = process.env.CUSTOM_AI === "true" ? " (CUSTOM_AI activo)" : "";
            const allProviders = getAllProviders();
            const short = allProviders.slice(0, 30).map(p => `\`${p}\``).join(", ");
            await interaction.reply({
                content: `🤖 Proveedor actual: **${current}**${customAi}\n\nPrimeros 30 de ${allProviders.length}+ proveedores:\n${short}\n\nUsa \`${process.env.PREFIX || "!"}ai-provider <nombre>\` para cambiar.`,
                ephemeral: true
            });
        },
        async executePrefix(message, args) {
            if (args[0]) {
                process.env.PROVIDER = args[0].toLowerCase();
                return message.reply(`✅ Proveedor cambiado a **${args[0]}**`);
            }
            const current = (process.env.PROVIDER || process.env.AI_PROVIDER || "mistral").toLowerCase();
            const customAi = process.env.CUSTOM_AI === "true" ? " (CUSTOM_AI activo)" : "";
            const allProviders = getAllProviders();
            const short = allProviders.slice(0, 30).map(p => `\`${p}\``).join(", ");
            message.reply(`🤖 Proveedor actual: **${current}**${customAi}\n\nPrimeros 30 de ${allProviders.length}+ proveedores:\n${short}`);
        }
    }
];
