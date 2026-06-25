/**
 * Custom Discord Bot - Módulo Principal
 * 
 * Permite usar el bot como un módulo de Node.js en otros proyectos.
 */

export { startBot, client } from './scr/main.js';
export { default as db } from './scr/database.js';
export { allCommands, loadAllCommands } from './scr/command-loader.js';
export { getCurrentVersion } from './scr/auto-update.js';
