import fs from "fs";
import path from "path";
import { createClient } from "redis";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_PATH = path.resolve(__dirname, "../secrets/db-local.json");

class DatabaseManager {
    constructor() {
        this.isRedis = false;
        this.redisClient = null;
        this.localData = {};
        
        this.init();
    }

    async init() {
        // Cargar base de datos local como fallback inicial
        this.loadLocal();

        const useRedis = process.env.REDIS_DB === "True" || process.env.REDIS_DB === "true";
        const redisUrl = process.env.REDIS_URL;

        if (useRedis && redisUrl) {
            try {
                this.redisClient = createClient({ url: redisUrl });
                this.redisClient.on("error", (err) => {
                    console.error("[!] Error de conexión en Redis. Usando base de datos local JSON.");
                    this.isRedis = false;
                });
                
                await this.redisClient.connect();
                console.log("[+] Conectado a base de datos Redis con éxito.");
                this.isRedis = true;
                // Si había datos locales guardados, migrarlos a Redis
                try {
                    await this._migrateLocalToRedis();
                } catch (err) {
                    console.error("[!] Error durante migración a Redis:", err.message);
                }
            } catch (err) {
                console.error("[!] No se pudo conectar a Redis. Usando base de datos local JSON.", err.message);
                this.isRedis = false;
            }
        } else {
            console.log("[*] Usando base de datos local JSON (secrets/db-local.json).");
            this.isRedis = false;
        }
    }

    loadLocal() {
        if (fs.existsSync(LOCAL_DB_PATH)) {
            try {
                const content = fs.readFileSync(LOCAL_DB_PATH, "utf8");
                this.localData = JSON.parse(content || "{}");
            } catch (err) {
                console.error("[!] Error al leer db-local.json, recreando...", err.message);
                this.localData = {};
                this.saveLocal();
            }
        } else {
            this.localData = {};
            this.saveLocal();
        }
    }

    saveLocal() {
        try {
            // Asegurar que existe la carpeta secrets
            const dir = path.dirname(LOCAL_DB_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(this.localData, null, 4), "utf8");
        } catch (err) {
            console.error("[!] Error al escribir en db-local.json:", err.message);
        }
    }

    async _migrateLocalToRedis() {
        if (!this.isRedis || !this.redisClient) return;
        const keys = Object.keys(this.localData || {});
        if (!keys.length) return;

        try {
            console.log(`[+] Migrando ${keys.length} clave(s) locales a Redis...`);
            for (const key of keys) {
                try {
                    await this.redisClient.set(key, JSON.stringify(this.localData[key]));
                } catch (err) {
                    console.error(`[!] Error al migrar key ${key} a Redis:`, err.message);
                }
            }

            // Hacer backup del archivo local antes de vaciarlo
            try {
                const backupPath = `${LOCAL_DB_PATH}.bak`;
                if (fs.existsSync(LOCAL_DB_PATH)) {
                    fs.copyFileSync(LOCAL_DB_PATH, backupPath);
                    console.log(`[+] Backup de la base local guardado en: ${backupPath}`);
                }
            } catch (err) {
                console.error("[!] No se pudo crear backup del db-local.json:", err.message);
            }

            // Vaciar la base local
            this.localData = {};
            this.saveLocal();
            console.log("[+] Migración a Redis completada. Ahora se usa Redis como fuente principal.");
        } catch (err) {
            console.error("[!] Error inesperado durante migración a Redis:", err.message);
        }
    }

    // --- Métodos Genéricos ---
    async get(key, defaultValue = null) {
        if (this.isRedis && this.redisClient) {
            try {
                const val = await this.redisClient.get(key);
                return val ? JSON.parse(val) : defaultValue;
            } catch (err) {
                console.error(`[!] Error al obtener key "${key}" de Redis:`, err.message);
            }
        }
        return this.localData[key] !== undefined ? this.localData[key] : defaultValue;
    }

    async set(key, value) {
        if (this.isRedis && this.redisClient) {
            try {
                await this.redisClient.set(key, JSON.stringify(value));
                return;
            } catch (err) {
                console.error(`[!] Error al escribir key "${key}" en Redis:`, err.message);
            }
        }
        this.localData[key] = value;
        this.saveLocal();
    }

    async delete(key) {
        if (this.isRedis && this.redisClient) {
            try {
                await this.redisClient.del(key);
                return;
            } catch (err) {
                console.error(`[!] Error al eliminar key "${key}" en Redis:`, err.message);
            }
        }
        delete this.localData[key];
        this.saveLocal();
    }

    // --- Helpers de Economía ---
    async getUserEconomy(userId) {
        const key = `economy:${userId}`;
        const defaults = {
            wallet: 100,
            bank: 0,
            inventory: [],
            lastDaily: 0,
            dailyStreak: 0,
            job: "Ninguno",
            lastWorked: 0,
            firstSeen: Date.now()
        };
        const data = await this.get(key, null);
        if (!data) {
            await this.set(key, defaults);
            return { ...defaults };
        }
        if (!data.firstSeen) {
            data.firstSeen = Date.now();
            await this.set(key, data);
        }
        return data;
    }

    async setUserEconomy(userId, economyData) {
        const key = `economy:${userId}`;
        if (!economyData.firstSeen) {
            economyData.firstSeen = Date.now();
        }
        await this.set(key, economyData);
    }

    async getEconomyLeaderboard(limit = 10) {
        const entries = [];
        const source = this.isRedis && this.redisClient
            ? await this._scanEconomyKeysRedis()
            : this._scanEconomyKeysLocal();

        for (const { userId, data } of source) {
            const total = (data.wallet || 0) + (data.bank || 0);
            entries.push({
                userId,
                total,
                wallet: data.wallet || 0,
                bank: data.bank || 0,
                firstSeen: data.firstSeen || 0
            });
        }
        return entries.sort((a, b) => b.total - a.total).slice(0, limit);
    }

    _scanEconomyKeysLocal() {
        return Object.entries(this.localData)
            .filter(([k]) => k.startsWith("economy:"))
            .map(([k, data]) => ({ userId: k.replace("economy:", ""), data }));
    }

    async _scanEconomyKeysRedis() {
        const results = [];
        try {
            const keys = await this.redisClient.keys("economy:*");
            for (const key of keys) {
                const raw = await this.redisClient.get(key);
                const data = raw ? JSON.parse(raw) : null;
                if (data) results.push({ userId: key.replace("economy:", ""), data });
            }
        } catch (err) {
            console.error("[!] Error al leer leaderboard de Redis:", err.message);
        }
        return results;
    }

    // --- Helpers de Niveles ---
    async getUserLevel(userId) {
        const key = `levels:${userId}`;
        return await this.get(key, {
            xp: 0,
            level: 0
        });
    }

    async setUserLevel(userId, levelData) {
        const key = `levels:${userId}`;
        await this.set(key, levelData);
    }

    // --- Helpers de Casos de Moderación ---
    async getCases(guildId) {
        const key = `cases:${guildId}`;
        return await this.get(key, []);
    }

    async setCases(guildId, cases) {
        const key = `cases:${guildId}`;
        await this.set(key, cases);
    }

    async addCase(guildId, caseData) {
        const cases = await this.getCases(guildId);
        caseData.id = cases.length + 1;
        caseData.timestamp = Date.now();
        cases.push(caseData);
        await this.setCases(guildId, cases);
        return caseData.id;
    }

    // --- Helpers de Configuración de Servidor ---
    async getSettings(guildId) {
        const key = `settings:${guildId}`;
        return await this.get(key, {
            prefix: "!",
            modRoles: [],
            adminRoles: [],
            logChannel: "",
            mutedRole: "",
            welcomeChannel: "",
            antiSpam: { active: false, maxMsg: 5, action: "mute" },
            antiRaid: { level: 0 },
            bannedWords: [],
            immuneRoles: []
        });
    }

    async setSettings(guildId, settings) {
        const key = `settings:${guildId}`;
        await this.set(key, settings);
    }

    // --- Helpers de Recovery y Backups ---
    async getBackups(guildId) {
        const key = `backups:${guildId}`;
        return await this.get(key, []);
    }

    async setBackups(guildId, backups) {
        const key = `backups:${guildId}`;
        await this.set(key, backups);
    }

    async saveBackup(guildId, backupData) {
        const backups = await this.getBackups(guildId);
        backupData.id = `BK-${Date.now()}`;
        backupData.timestamp = Date.now();
        backups.unshift(backupData); // Lo más nuevo al inicio
        // Límite de 3 backups
        if (backups.length > 3) {
            backups.pop();
        }
        await this.setBackups(guildId, backups);
        return backupData.id;
    }
}

export const db = new DatabaseManager();
export default db;
