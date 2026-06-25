#!/usr/bin/env bash
# Custom Discord Bot — Wrapper Global

# Determinar el directorio real del script, incluso si es un enlace simbólico
SCRIPT_DIR="$( cd "$( dirname "$(readlink -f "$0" || realpath "$0" || echo "$0")" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Detectar Termux y asegurar Node.js
if [ -d "/data/data/com.termux/files/usr" ] || [ -n "$TERMUX_VERSION" ]; then
    if ! command -v node &> /dev/null; then
        echo "[*] Instalando Node.js en Termux..."
        pkg update -y && pkg install -y nodejs git
    fi
fi

if ! command -v node &> /dev/null; then
    echo "[!] Node.js no encontrado. Instálalo desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[!] Se requiere Node.js 18+. Versión actual: $(node -v)"
    exit 1
fi

# Funciones auxiliares
show_help() {
    echo "Uso: discord-customizable-bot [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  --help          Muestra esta ayuda."
    echo "  --stop          Detiene todos los procesos del bot ejecutándose en segundo plano."
    echo "  --reload        Actualiza dependencias (npm install) y reinicia el bot."
    echo "  --mode --lite   Inicia el bot con configuraciones optimizadas (Modo Termux/Eco)."
    echo "  --mode --dev    Inicia el bot en modo desarrollo (nodemon)."
    echo "  --mode          Inicia el bot en modo normal (producción)."
    echo ""
    echo "Si no se pasan argumentos, se abrirá el menú interactivo por defecto."
}

stop_bot() {
    echo "[*] Deteniendo procesos del bot..."
    # Buscar procesos de node ejecutando nuestro bot y matarlos
    if pkill -f "node scr/stared.js" || pkill -f "nodemon scr/main.js" || pkill -f "node start.js"; then
        echo "[✓] Bot detenido."
    else
        echo "[-] No se encontraron procesos del bot ejecutándose."
    fi
}

start_daemon() {
    echo "[*] Iniciando bot en segundo plano (daemon)..."
    export AUTO=true
    nohup node scr/stared.js > /dev/null 2>&1 &
    echo "[✓] Bot iniciado. PID: $!"
}

# Parseo de argumentos
if [ $# -eq 0 ]; then
    # Comportamiento original sin argumentos: abrir menú
    exec node start.js
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            show_help
            exit 0
            ;;
        --stop)
            stop_bot
            exit 0
            ;;
        --reload)
            stop_bot
            echo "[*] Actualizando dependencias..."
            npm install --omit=dev
            start_daemon
            exit 0
            ;;
        --mode)
            if [ "$2" == "--lite" ]; then
                echo "[*] Iniciando en Modo Lite (Eco)..."
                export TERMUX_LITE_MODE=true
                export AUTO=true
                exec node scr/stared.js
            elif [ "$2" == "--dev" ]; then
                echo "[*] Iniciando en Modo Desarrollo..."
                exec npx nodemon scr/main.js
            else
                echo "[*] Iniciando en Modo Normal..."
                export AUTO=true
                exec node scr/stared.js
            fi
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done
