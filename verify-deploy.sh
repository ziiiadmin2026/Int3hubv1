#!/bin/bash
# ==========================================
# Pre-Deploy Verification Script
# ==========================================
# Verifica que todo esté configurado correctamente antes del deploy

set -e

ERRORS=0
WARNINGS=0

echo "=========================================="
echo "  Pre-Deploy Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

info() {
    echo "[INFO] $1"
}

echo "1. Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    success "Docker instalado: $DOCKER_VERSION"
else
    error "Docker no está instalado"
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
    success "Docker Compose instalado: $COMPOSE_VERSION"
else
    error "Docker Compose no está instalado"
fi

echo ""
echo "2. Verificando archivos de configuración..."

# .env.production
if [ -f ".env.production" ]; then
    success "Archivo .env.production existe"
    
    if grep -q "tu-dominio.com" .env.production; then
        warning "Dominio no configurado en .env.production"
    else
        success "Dominio configurado en .env.production"
    fi
else
    error "Archivo .env.production no encontrado"
fi

# backend/.env.production
if [ -f "backend/.env.production" ]; then
    success "Archivo backend/.env.production existe"
    
    if grep -q "CAMBIAR_ESTO" backend/.env.production; then
        error "Variables de entorno no configuradas en backend/.env.production"
        echo "      Genera claves con: openssl rand -hex 32"
    else
        success "Variables de entorno configuradas"
    fi
    
    if grep -q "tu-dominio.com" backend/.env.production; then
        warning "Dominio no configurado en backend/.env.production"
    else
        success "Dominio configurado en backend/.env.production"
    fi
else
    error "Archivo backend/.env.production no encontrado"
fi

# nginx config
if [ -f "docker/nginx/conf.d/site.conf" ]; then
    success "Configuración de nginx existe"
    
    if grep -q "your-domain.com" docker/nginx/conf.d/site.conf; then
        warning "Dominio no configurado en site.conf"
    else
        success "Dominio configurado en site.conf"
    fi
else
    error "Configuración de nginx no encontrada"
fi

echo ""
echo "3. Verificando certificados SSL..."

if [ -d "certs" ]; then
    success "Carpeta certs existe"
    
    if [ -f "certs/fullchain.pem" ]; then
        success "Certificado fullchain.pem encontrado"
        
        # Verificar si es auto-firmado
        if openssl x509 -in certs/fullchain.pem -noout -text | grep -q "Issuer.*CN.*localhost"; then
            warning "Certificado es auto-firmado (solo para testing)"
        else
            success "Certificado parece ser válido"
        fi
    else
        error "Certificado fullchain.pem no encontrado"
    fi
    
    if [ -f "certs/privkey.pem" ]; then
        success "Certificado privkey.pem encontrado"
        
        # Verificar permisos
        PERMS=$(stat -c %a certs/privkey.pem 2>/dev/null || stat -f %A certs/privkey.pem)
        if [ "$PERMS" = "600" ] || [ "$PERMS" = "644" ]; then
            success "Permisos del certificado correctos"
        else
            warning "Permisos del certificado deberían ser 600 o 644"
        fi
    else
        error "Certificado privkey.pem no encontrado"
    fi
else
    error "Carpeta certs no existe"
fi

echo ""
echo "4. Verificando estructura de directorios..."

DIRS=("backend" "docker/nginx/conf.d" "pages" "components" "public")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        success "Directorio $dir existe"
    else
        error "Directorio $dir no encontrado"
    fi
done

echo ""
echo "5. Verificando archivos clave..."

FILES=("package.json" "backend/package.json" "Dockerfile" "docker-compose.yml" "next.config.js")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Archivo $file existe"
    else
        error "Archivo $file no encontrado"
    fi
done

echo ""
echo "6. Verificando conectividad de red..."

if command -v nc &> /dev/null; then
    info "Verificando puerto 80..."
    if nc -z -w1 localhost 80 2>/dev/null; then
        warning "Puerto 80 ya está en uso"
    else
        success "Puerto 80 disponible"
    fi
    
    info "Verificando puerto 443..."
    if nc -z -w1 localhost 443 2>/dev/null; then
        warning "Puerto 443 ya está en uso"
    else
        success "Puerto 443 disponible"
    fi
else
    info "Comando 'nc' no disponible, saltando verificación de puertos"
fi

echo ""
echo "=========================================="
echo "  Resumen"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Todo listo para deploy!${NC}"
    echo ""
    echo "Ejecuta:"
    echo "  ./deploy.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS advertencias encontradas${NC}"
    echo ""
    echo "Puedes continuar, pero revisa las advertencias."
    echo ""
    read -p "¿Deseas continuar de todas formas? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Ejecuta: ./deploy.sh"
        exit 0
    else
        exit 1
    fi
else
    echo -e "${RED}❌ $ERRORS errores encontrados${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS advertencias encontradas${NC}"
    fi
    echo ""
    echo "Por favor corrige los errores antes de continuar."
    echo "Consulta: PRE-DEPLOY-CHECKLIST.md"
    exit 1
fi
