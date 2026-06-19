#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
show_help() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Discord Bot Docker Helper v2.0                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Uso: ./docker-helper.sh [comando]"
    echo ""
    echo -e "${GREEN}Comandos disponibles:${NC}"
    echo "  start      - Iniciar los contenedores (build + up)"
    echo "  stop       - Detener los contenedores"
    echo "  restart    - Reiniciar los contenedores"
    echo "  logs       - Ver logs del bot en tiempo real"
    echo "  build      - Construir la imagen"
    echo "  shell      - Acceder a la shell del bot"
    echo "  status     - Ver estado de los contenedores"
    echo "  health     - Verificar health check del bot"
    echo "  status-url - Abrir página de estado en el navegador"
    echo "  clean      - Detener y eliminar contenedores"
    echo "  clean-all  - Limpiar todo (contenedores, volúmenes, imágenes)"
    echo "  setup      - Configuración inicial (.env)"
    echo "  help       - Mostrar esta ayuda"
    echo ""
}

check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${RED}[!] Error: archivo .env no encontrado${NC}"
        echo -e "${YELLOW}[*] Ejecuta: ./docker-helper.sh setup${NC}"
        exit 1
    fi
}

start_containers() {
    check_env
    echo -e "${BLUE}[*] Iniciando contenedores...${NC}"
    docker-compose up -d
    sleep 2
    echo -e "${GREEN}[✓] Contenedores iniciados${NC}"
    docker-compose ps
}

stop_containers() {
    echo -e "${BLUE}[*] Deteniendo contenedores...${NC}"
    docker-compose down
    echo -e "${GREEN}[✓] Contenedores detenidos${NC}"
}

restart_containers() {
    echo -e "${BLUE}[*] Reiniciando contenedores...${NC}"
    docker-compose restart
    sleep 2
    echo -e "${GREEN}[✓] Contenedores reiniciados${NC}"
}

show_logs() {
    check_env
    echo -e "${BLUE}[*] Mostrando logs del bot (Ctrl+C para salir)...${NC}"
    docker-compose logs -f bot
}

build_image() {
    check_env
    echo -e "${BLUE}[*] Construyendo imagen...${NC}"
    docker-compose build
    echo -e "${GREEN}[✓] Imagen construida${NC}"
}

access_shell() {
    check_env
    echo -e "${BLUE}[*] Accediendo a la shell del bot...${NC}"
    docker-compose exec bot sh
}

show_status() {
    echo -e "${BLUE}[*] Estado de los contenedores:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}[*] Uso de recursos:${NC}"
    docker stats --no-stream 2>/dev/null || echo "(docker stats no disponible)"
}

check_health() {
    check_env
    local port=$(grep -oP 'PORT=\K.*' .env 2>/dev/null || echo "3000")
    echo -e "${BLUE}[*] Verificando health check en puerto ${port}...${NC}"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/api/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}[✓] Bot saludable (HTTP ${response})${NC}"
        curl -s "http://localhost:${port}/api/health" 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:${port}/api/health" 2>/dev/null
    else
        echo -e "${RED}[✕] Bot no responde (HTTP ${response:-sin respuesta})${NC}"
        echo -e "${YELLOW}[*] Verifica los logs: ./docker-helper.sh logs${NC}"
    fi
}

open_status_page() {
    check_env
    local port=$(grep -oP 'PORT=\K.*' .env 2>/dev/null || echo "3000")
    local url="http://localhost:${port}/status"
    echo -e "${BLUE}[*] Abriendo página de estado: ${url}${NC}"
    if command -v xdg-open &> /dev/null; then
        xdg-open "$url"
    elif command -v open &> /dev/null; then
        open "$url"
    else
        echo -e "${YELLOW}[*] No se pudo abrir el navegador automáticamente${NC}"
        echo -e "${GREEN}Abre manualmente: ${url}${NC}"
    fi
}

clean_containers() {
    echo -e "${YELLOW}[!] Deteniendo y eliminando contenedores...${NC}"
    docker-compose down
    echo -e "${GREEN}[✓] Contenedores eliminados${NC}"
}

clean_all() {
    echo -e "${RED}[!] ADVERTENCIA: Esto eliminará contenedores, volúmenes e imágenes${NC}"
    read -p "¿Estás seguro? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${BLUE}[*] Limpiando todo...${NC}"
        docker-compose down -v
        docker rmi discord-bot
        echo -e "${GREEN}[✓] Todo limpiado${NC}"
    else
        echo -e "${YELLOW}[*] Cancelado${NC}"
    fi
}

setup_env() {
    if [ -f ".env" ]; then
        echo -e "${YELLOW}[!] El archivo .env ya existe${NC}"
        read -p "¿Sobrescribir? (s/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            echo -e "${YELLOW}[*] Cancelado${NC}"
            return
        fi
    fi
    
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}[!] Error: .env.example no encontrado${NC}"
        exit 1
    fi
    
    cp .env.example .env
    echo -e "${GREEN}[✓] Archivo .env creado${NC}"
    echo -e "${YELLOW}[!] Edita .env y reemplaza DISCORD_TOKEN con tu token real${NC}"
    echo ""
    read -p "¿Abrir .env en el editor? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        ${EDITOR:-nano} .env
    fi
}

# Main
case "${1:-help}" in
    start)
        start_containers
        ;;
    stop)
        stop_containers
        ;;
    restart)
        restart_containers
        ;;
    logs)
        show_logs
        ;;
    build)
        build_image
        ;;
    shell)
        access_shell
        ;;
    status)
        show_status
        ;;
    health)
        check_health
        ;;
    status-url)
        open_status_page
        ;;
    clean)
        clean_containers
        ;;
    clean-all)
        clean_all
        ;;
    setup)
        setup_env
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}[!] Comando desconocido: $1${NC}"
        show_help
        exit 1
        ;;
esac
