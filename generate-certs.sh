#!/bin/bash
# Script para generar certificados SSL auto-firmados para desarrollo/testing

set -e

DOMAIN=${1:-localhost}
CERT_DIR="certs"

echo "=========================================="
echo "  Generador de Certificados SSL"
echo "=========================================="
echo ""
echo "Generando certificados para: $DOMAIN"
echo ""

# Crear directorio si no existe
mkdir -p "$CERT_DIR"

# Generar certificado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=$DOMAIN" \
  2>/dev/null

echo "✅ Certificados generados exitosamente en: $CERT_DIR/"
echo ""
echo "Archivos creados:"
echo "  - $CERT_DIR/fullchain.pem"
echo "  - $CERT_DIR/privkey.pem"
echo ""
echo "⚠️  ADVERTENCIA: Estos son certificados auto-firmados"
echo "   Solo para desarrollo/testing. NO usar en producción."
echo ""
echo "Para producción, usa Let's Encrypt:"
echo "  sudo certbot certonly --standalone -d $DOMAIN"
echo ""
