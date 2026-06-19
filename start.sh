#!/bin/bash
# Custom Discord Bot — delega al launcher Python con interfaz Rich
cd "$(dirname "$0")" || exit 1

if ! command -v python3 &> /dev/null; then
    echo "[!] Python 3 no encontrado. Ejecutando modo básico..."
    exec npm start
fi

if ! python3 -c "import rich" 2>/dev/null; then
    echo "[*] Instalando dependencias Python (rich)..."
    python3 -m pip install --user rich -q 2>/dev/null || python3 -m pip install rich -q --break-system-packages 2>/dev/null
fi

exec python3 scr/stared.py
