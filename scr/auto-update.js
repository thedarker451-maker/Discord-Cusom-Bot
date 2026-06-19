import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(ROOT, ".bot-version");
const CURRENT_VERSION = "2.0.0";

function isOnRender() {
    return Boolean(process.env.RENDER);
}

function isGitRepo() {
    try {
        execSync("git rev-parse --is-inside-work-tree", { cwd: ROOT, stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function getLocalVersion() {
    try {
        if (fs.existsSync(VERSION_FILE)) {
            return fs.readFileSync(VERSION_FILE, "utf8").trim();
        }
    } catch {}
    return CURRENT_VERSION;
}

function saveVersion(v) {
    try {
        fs.writeFileSync(VERSION_FILE, v, "utf8");
    } catch {}
}

function gitPull() {
    try {
        execSync("git fetch origin main", { cwd: ROOT, stdio: "pipe", timeout: 30000 });
        const behind = execSync("git rev-list HEAD..origin/main --count", { cwd: ROOT, text: true, stdio: "pipe" }).trim();
        if (parseInt(behind) > 0) {
            console.log(`[AutoUpdate] ${behind} commit(s) disponibles. Actualizando...`);
            execSync("git pull origin main", { cwd: ROOT, stdio: "pipe", timeout: 60000 });
            const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
            saveVersion(pkg.version || CURRENT_VERSION);
            console.log(`[AutoUpdate] Actualizado a v${pkg.version || CURRENT_VERSION}. Reiniciando...`);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`[AutoUpdate] Error durante git pull: ${err.message}`);
        return false;
    }
}

function checkNpmUpdates() {
    try {
        const outdated = execSync("npm outdated --json", { cwd:ROOT, text: true, stdio: "pipe" });
        const data = JSON.parse(outdated || "{}");
        const count = Object.keys(data).length;
        if (count > 0) {
            console.log(`[AutoUpdate] ${count} dependencia(s) desactualizada(s). Ejecutando npm install...`);
            execSync("npm install --production", { cwd: ROOT, stdio: "pipe", timeout: 120000 });
            console.log("[AutoUpdate] Dependencias actualizadas.");
        }
    } catch {}
}

export function checkForUpdates() {
    if (isOnRender()) {
        console.log("[AutoUpdate] Detectado Render — saltando auto-update (usa git push para deploy).");
        return false;
    }

    if (!isGitRepo()) {
        console.log("[AutoUpdate] No es un repositorio git — auto-update deshabilitado.");
        return false;
    }

    console.log(`[AutoUpdate] Versión local: v${getLocalVersion()}`);
    const updated = gitPull();
    if (updated) {
        checkNpmUpdates();
    } else {
        console.log("[AutoUpdate] Ya estás en la última versión.");
    }
    return updated;
}

export function getCurrentVersion() {
    return CURRENT_VERSION;
}
