import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_PATH = path.resolve(__dirname, "../secrets/.key");
const ENV_PATH = path.resolve(__dirname, "../secrets/.env");

// Variables que NO deben encriptarse (son configuración, no secretos)
const SKIP_KEYS = ["PREFIX", "SLASH_COMANDS", "REDIS_DB", "PROVIDER", "AI_MODEL", "ACTIVE", "REFRESH", "PORT", "TELEMETRY_STATE", "WELCOME_MESSAGE_HELP", "LEADERBOARD_ENABLED", "PUBLIC_URL", "DISABLE_ENCRYPTION", "CUSTOM_AI", "CUSTOM_URL", "AI_BASE_URL", "CLOUDFLARE_ACCOUNT_ID", "BAIDU_SECRET", "BOT_ACTIVITY_TYPE", "BOT_ACTIVITY_TEXT", "BOT_ACTIVITY_URL", "BOT_ACTIVITY_STATE", "BOT_ACTIVITY_LARGE_IMAGE", "BOT_ACTIVITY_LARGE_IMAGE_TEXT", "BOT_ACTIVITY_SMALL_IMAGE", "BOT_ACTIVITY_SMALL_IMAGE_TEXT"];

// ── Clave de Encriptación ─────────────────────────────────────
export function getEncryptionKey() {
    if (!fs.existsSync(KEY_PATH)) {
        const randomKey = crypto.randomBytes(32).toString("hex");
        const content = `# NUNCA COMPARTAS ESTE ARCHIVO\n# Si alguien obtiene esta clave puede descifrar todas tus credenciales\n\nENCRIPTION_KEY=${randomKey}\n`;
        fs.writeFileSync(KEY_PATH, content, "utf8");
        console.log("[+] Nueva clave de encriptación generada en secrets/.key");
        return randomKey;
    }

    const content = fs.readFileSync(KEY_PATH, "utf8");
    const match = content.match(/ENCRIPTION_KEY=([a-f0-9]+)/i) || content.match(/ENCRYPTION_KEY=([a-f0-9]+)/i);
    if (match) return match[1];

    // Archivo dañado — regenerar
    const randomKey = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(KEY_PATH, `# Regenerada automáticamente\n\nENCRIPTION_KEY=${randomKey}\n`, "utf8");
    console.log("[!] Clave dañada, se ha regenerado.");
    return randomKey;
}

// ── AES-256-GCM ──────────────────────────────────────────────
export function encrypt(text, keyHex) {
    if (!text || text.trim() === "") return text;
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `ENC:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText, keyHex) {
    if (!encryptedText || !encryptedText.startsWith("ENC:")) return encryptedText;
    try {
        const key = Buffer.from(keyHex, "hex");
        const parts = encryptedText.substring(4).split(":");
        if (parts.length !== 3) return encryptedText;
        const [ivHex, authTagHex, encrypted] = parts;
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch {
        console.error("[!] Error al desencriptar un valor. ¿Cambió la clave?");
        return "[ERROR_DECRYPTION]";
    }
}

// ── Carga segura en process.env ───────────────────────────────
export function loadAndDecryptEnv() {
    if (!fs.existsSync(ENV_PATH)) {
        console.warn(`[!] secrets/.env no encontrado en: ${ENV_PATH}`);
        return;
    }

    const keyHex = getEncryptionKey();
    const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;

        const envKey = trimmed.substring(0, eq).trim();
        let envVal = trimmed.substring(eq + 1).trim();

        // Eliminar comentarios inline (ej: VALUE=abc #comentario)
        const commentIdx = envVal.indexOf(" #");
        if (commentIdx !== -1) envVal = envVal.substring(0, commentIdx).trim();

        process.env[envKey] = envVal.startsWith("ENC:") ? decrypt(envVal, keyHex) : envVal;
    }
}

// ── Encriptar todas las claves sensibles del .env ─────────────
function encryptEnv(keyHex) {
    if (!fs.existsSync(ENV_PATH)) {
        console.log("[-] secrets/.env no encontrado.");
        return;
    }

    const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
    
    // Si el usuario puso DISABLE_ENCRYPTION=true en el .env, desencriptar si hay algo y abortar la encriptación
    const disableEncryption = lines.some(l => l.trim().match(/^DISABLE_ENCRYPTION=(true|1)$/i));
    if (disableEncryption) {
        const hasEncrypted = lines.some(l => {
            const eq = l.indexOf("=");
            return eq !== -1 && l.substring(eq + 1).trim().startsWith("ENC:");
        });
        if (hasEncrypted) {
            console.log("[-] Encriptación deshabilitada (DISABLE_ENCRYPTION=true). Desencriptando claves...");
            decryptAllEnv(keyHex);
        } else {
            console.log("[-] Encriptación deshabilitada por DISABLE_ENCRYPTION=true en .env");
        }
        return;
    }

    let modified = 0;

    const result = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        const eq = trimmed.indexOf("=");
        if (eq === -1) return line;

        const envKey = trimmed.substring(0, eq).trim();

        // Saltar claves de configuración no sensibles
        if (SKIP_KEYS.includes(envKey)) return line;

        // Separar valor de comentario inline
        let rawVal = trimmed.substring(eq + 1).trim();
        let inlineComment = "";
        const commentIdx = rawVal.indexOf(" #");
        if (commentIdx !== -1) {
            inlineComment = " " + rawVal.substring(commentIdx + 1);
            rawVal = rawVal.substring(0, commentIdx).trim();
        }

        // Si está vacío o ya encriptado, no tocar
        if (!rawVal || rawVal.startsWith("ENC:")) return line;

        const encrypted = encrypt(rawVal, keyHex);
        modified++;
        console.log(`  [+] Encriptado: ${envKey}`);
        return `${envKey}=${encrypted}${inlineComment}`;
    });

    if (modified > 0) {
        fs.writeFileSync(ENV_PATH, result.join("\n"), "utf8");
        console.log(`[+] ${modified} variable(s) encriptada(s) en secrets/.env`);
    } else {
        console.log("[+] Todas las variables ya están encriptadas o vacías.");
    }
}

// ── Resetear: desencriptar el .env y borrar la clave ─────────
function resetKey() {
    if (!fs.existsSync(KEY_PATH)) {
        console.log("[-] No existe una clave en secrets/.key para restablecer.");
        return;
    }
    if (!fs.existsSync(ENV_PATH)) {
        console.log("[-] No existe secrets/.env.");
        return;
    }

    const keyHex = getEncryptionKey();
    const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);

    // Desencriptar todos los valores ENC: al texto plano
    const result = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        const eq = trimmed.indexOf("=");
        if (eq === -1) return line;

        const envKey = trimmed.substring(0, eq).trim();
        let rawVal = trimmed.substring(eq + 1).trim();

        let inlineComment = "";
        const commentIdx = rawVal.indexOf(" #");
        if (commentIdx !== -1) {
            inlineComment = " " + rawVal.substring(commentIdx + 1);
            rawVal = rawVal.substring(0, commentIdx).trim();
        }

        if (rawVal.startsWith("ENC:")) {
            const decrypted = decrypt(rawVal, keyHex);
            if (decrypted === "[ERROR_DECRYPTION]") {
                console.error(`  [!] No se pudo descifrar: ${envKey}. Se dejará como está.`);
                return line;
            }
            console.log(`  [~] Desencriptado: ${envKey}`);
            return `${envKey}=${decrypted}${inlineComment}`;
        }
        return line;
    });

    fs.writeFileSync(ENV_PATH, result.join("\n"), "utf8");

    // Borrar el archivo .key
    fs.unlinkSync(KEY_PATH);
    console.log("[+] secrets/.key eliminado. El .env ahora está en texto plano.");
    console.log("[!] Ejecuta npm run security o inicia el bot para generar una nueva clave.");
}

// ── Desencriptar todos los valores ENC: del .env ──────────────
function decryptAllEnv(keyHex) {
    if (!fs.existsSync(ENV_PATH)) {
        console.log("[-] secrets/.env no encontrado.");
        return;
    }

    const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
    let modified = 0;

    const result = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        const eq = trimmed.indexOf("=");
        if (eq === -1) return line;

        const envKey = trimmed.substring(0, eq).trim();
        let rawVal = trimmed.substring(eq + 1).trim();

        let inlineComment = "";
        const commentIdx = rawVal.indexOf(" #");
        if (commentIdx !== -1) {
            inlineComment = " " + rawVal.substring(commentIdx + 1);
            rawVal = rawVal.substring(0, commentIdx).trim();
        }

        if (rawVal.startsWith("ENC:")) {
            const decrypted = decrypt(rawVal, keyHex);
            if (decrypted === "[ERROR_DECRYPTION]") {
                console.error(`  [!] No se pudo descifrar: ${envKey}. Se dejará como está.`);
                return line;
            }
            modified++;
            console.log(`  [~] Desencriptado: ${envKey}`);
            return `${envKey}=${decrypted}${inlineComment}`;
        }
        return line;
    });

    if (modified > 0) {
        fs.writeFileSync(ENV_PATH, result.join("\n"), "utf8");
        console.log(`[+] ${modified} variable(s) desencriptada(s) en secrets/.env`);
        console.log("[*] La clave secrets/.key se mantiene intacta.");
    } else {
        console.log("[+] No hay variables encriptadas (ENC:) en secrets/.env.");
    }
}

// ── CLI ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDirectRun = process.argv[1] &&
    (process.argv[1].endsWith("security-helper.js") || process.argv[1].endsWith("security-helper"));

if (isDirectRun) {
    const keyHex = getEncryptionKey();

    if (args.includes("--reset")) {
        resetKey();
    } else if (args.includes("--decrypt-all") || args.includes("--decrypt")) {
        decryptAllEnv(keyHex);
    } else if (args.includes("--encrypt") || args.includes("--check")) {
        encryptEnv(keyHex);
    } else {
        console.log("Uso: node scr/security-helper.js [--encrypt|--decrypt-all|--reset]");
    }
}
