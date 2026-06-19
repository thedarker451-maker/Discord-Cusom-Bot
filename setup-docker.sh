#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       Discord Bot Docker - Quick Start Setup                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instálalo desde: https://www.docker.com"
    exit 1
fi

echo "✅ Docker detectado: $(docker --version)"
echo "✅ Docker Compose detectado: $(docker-compose --version)"
echo ""

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado"
    echo ""
    echo "⚠️  IMPORTANTE: Edita el archivo .env y reemplaza:"
    echo "   DISCORD_TOKEN=tu_token_de_discord_aqui"
    echo ""
    read -p "¿Presiona Enter para continuar..."
fi

# Crear directorio secrets si no existe
if [ ! -d "secrets" ]; then
    echo ""
    echo "📂 Creando directorio secrets..."
    mkdir -p secrets
    echo "✅ Directorio secrets creado"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    PRÓXIMOS PASOS                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Edita tu token de Discord en .env:"
echo "    nano .env"
echo ""
echo "2️⃣  Inicia los contenedores:"
echo "    docker-compose up -d"
echo ""
echo "3️⃣  Verifica los logs:"
echo "    docker-compose logs -f bot"
echo ""
echo "4️⃣  O usa el script helper para facilitar las operaciones:"
echo "    ./docker-helper.sh start"
echo ""
echo "📚 Para más información, lee: DOCKER.md"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    COMANDOS ÚTILES                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Script Helper (recomendado):"
echo "  ./docker-helper.sh start      - Iniciar"
echo "  ./docker-helper.sh logs       - Ver logs"
echo "  ./docker-helper.sh stop       - Detener"
echo "  ./docker-helper.sh status     - Estado"
echo ""
echo "Docker Compose (avanzado):"
echo "  docker-compose up -d          - Iniciar en background"
echo "  docker-compose logs -f bot    - Ver logs en tiempo real"
echo "  docker-compose down           - Detener"
echo "  docker-compose ps             - Ver estado"
echo ""
