#!/bin/bash
# ==========================================
# Deploy Script - pfSense Firewall Hub
# ==========================================
# Este script automatiza el deploy del sistema en producción

set -e  # Exit on error

echo "🚀 Iniciando deploy de pfSense Firewall Hub..."
echo "================================================"

# ==========================================
# 1. Verificar archivos requeridos
# ==========================================
echo ""
echo "📋 1. Verificando archivos de configuración..."

if [ ! -f ".env.production" ]; then
    echo "❌ Error: Archivo .env.production no encontrado"
    echo "   Copia .env.example a .env.production y configúralo"
    exit 1
fi

if [ ! -f "backend/.env.production" ]; then
    echo "❌ Error: Archivo backend/.env.production no encontrado"
    echo "   Revisa el archivo backend/.env.example"
    exit 1
fi

if [ ! -f "docker/nginx/conf.d/site.conf" ]; then
    echo "❌ Error: Configuración de nginx no encontrada"
    exit 1
fi

echo "✅ Archivos de configuración OK"

# ==========================================
# 2. Verificar certificados SSL
# ==========================================
echo ""
echo "🔐 2. Verificando certificados SSL..."

if [ ! -d "certs" ]; then
    echo "⚠️  Advertencia: Carpeta de certificados no existe"
    echo "   Creando carpeta certs/..."
    mkdir -p certs
    echo ""
    echo "   Por favor, coloca tus certificados SSL en la carpeta 'certs':"
    echo "   - certs/fullchain.pem"
    echo "   - certs/privkey.pem"
    echo ""
    read -p "   Presiona Enter cuando hayas colocado los certificados..."
fi

if [ ! -f "certs/fullchain.pem" ] || [ ! -f "certs/privkey.pem" ]; then
    echo "❌ Error: Certificados SSL no encontrados"
    echo "   Necesitas:"
    echo "   - certs/fullchain.pem"
    echo "   - certs/privkey.pem"
    echo ""
    echo "   Para desarrollo, puedes generar certificados auto-firmados:"
    echo "   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    echo "     -keyout certs/privkey.pem -out certs/fullchain.pem"
    exit 1
fi

echo "✅ Certificados SSL encontrados"

# ==========================================
# 3. Verificar variables de entorno críticas
# ==========================================
echo ""
echo "🔍 3. Verificando variables de entorno..."

if grep -q "CAMBIAR_ESTO" backend/.env.production; then
    echo "❌ Error: Variables de entorno no configuradas"
    echo "   Edita backend/.env.production y configura:"
    echo "   - ENCRYPTION_KEY (genera con: openssl rand -hex 32)"
    echo "   - JWT_SECRET (genera con: openssl rand -hex 32)"
    exit 1
fi

if grep -q "tu-dominio.com" .env.production; then
    echo "⚠️  Advertencia: Dominio no configurado en .env.production"
    read -p "   ¿Continuar de todas formas? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Variables de entorno configuradas"

# ==========================================
# 4. Detener contenedores existentes
# ==========================================
echo ""
echo "🛑 4. Deteniendo contenedores existentes..."

if [ "$(docker ps -q -f name=pfsense-hub)" ]; then
    docker-compose down
    echo "✅ Contenedores detenidos"
else
    echo "ℹ️  No hay contenedores en ejecución"
fi

# ==========================================
# 5. Limpiar imágenes antiguas (opcional)
# ==========================================
echo ""
read -p "🗑️  ¿Deseas limpiar imágenes Docker antiguas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Limpiando imágenes antiguas..."
    docker image prune -f
    echo "✅ Imágenes limpiadas"
fi

# ==========================================
# 6. Build de la aplicación
# ==========================================
echo ""
echo "🏗️  6. Construyendo imágenes Docker..."
docker-compose build --no-cache

echo "✅ Build completado"

# ==========================================
# 7. Iniciar servicios
# ==========================================
echo ""
echo "🚀 7. Iniciando servicios..."
docker-compose up -d

echo "✅ Servicios iniciados"

# ==========================================
# 8. Verificar estado de los servicios
# ==========================================
echo ""
echo "🔍 8. Verificando estado de los servicios..."
sleep 5

if ! docker ps | grep -q "pfsense-hub-app.*Up"; then
    echo "❌ Error: El contenedor de la aplicación no está corriendo"
    echo ""
    echo "Logs del contenedor:"
    docker-compose logs app
    exit 1
fi

if ! docker ps | grep -q "pfsense-hub-nginx.*Up"; then
    echo "❌ Error: El contenedor de nginx no está corriendo"
    echo ""
    echo "Logs del contenedor:"
    docker-compose logs nginx
    exit 1
fi

echo "✅ Todos los servicios están corriendo"

# ==========================================
# 9. Mostrar información del deploy
# ==========================================
echo ""
echo "================================================"
echo "✅ Deploy completado exitosamente!"
echo "================================================"
echo ""
echo "📊 Estado de los servicios:"
docker-compose ps
echo ""
echo "🌐 Accede a tu aplicación en:"
echo "   https://tu-dominio.com"
echo ""
echo "📝 Comandos útiles:"
echo "   Ver logs:           docker-compose logs -f"
echo "   Logs de app:        docker-compose logs -f app"
echo "   Logs de nginx:      docker-compose logs -f nginx"
echo "   Detener servicios:  docker-compose down"
echo "   Reiniciar:          docker-compose restart"
echo ""
echo "🔒 Recuerda:"
echo "   - Configura tu firewall para permitir tráfico en puertos 80 y 443"
echo "   - Configura DNS para apuntar a este servidor"
echo "   - Revisa los logs regularmente"
echo ""
