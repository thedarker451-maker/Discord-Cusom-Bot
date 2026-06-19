import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const allCommands = [];

export async function loadAllCommands() {
    const comandosDir = path.resolve(__dirname, "../comandos");
    if (!fs.existsSync(comandosDir)) {
        fs.mkdirSync(comandosDir, { recursive: true });
    }

    const files = fs.readdirSync(comandosDir).filter(file => file.endsWith(".js"));
    
    // Limpiar el array para recargas en caliente
    allCommands.length = 0;
    
    for (const file of files) {
        const filePath = path.resolve(comandosDir, file);
        // Formato URL para importaciones dinámicas ESM
        const fileUrl = `file://${filePath}`;
        
        try {
            const module = await import(fileUrl);
            
            // Recorrer todas las claves exportadas por el archivo
            for (const key of Object.keys(module)) {
                const exported = module[key];
                if (Array.isArray(exported)) {
                    for (const cmd of exported) {
                        if (cmd && typeof cmd === "object" && cmd.name) {
                            allCommands.push(cmd);
                        }
                    }
                } else if (exported && typeof exported === "object" && exported.name) {
                    allCommands.push(exported);
                }
            }
        } catch (err) {
            console.error(`[!] Error al cargar dinámicamente el comando en "${file}":`, err.message);
        }
    }
    
    console.log(`[+] Cargados dinámicamente ${allCommands.length} comandos de ${files.length} archivos.`);
    return allCommands;
}
