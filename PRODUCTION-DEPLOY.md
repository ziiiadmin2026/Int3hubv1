# 🚀 Guía de Deploy en Producción

## pfSense Firewall Hub - Production Deployment Guide

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Inicial](#configuración-inicial)
3. [Certificados SSL](#certificados-ssl)
4. [Variables de Entorno](#variables-de-entorno)
5. [Deploy con Docker](#deploy-con-docker)
6. [Verificación](#verificación)
7. [Mantenimiento](#mantenimiento)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

### Hardware Mínimo
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disco**: 20GB SSD
- **Red**: Conexión estable a internet

### Software Necesario
- Docker 20.10+ y Docker Compose 2.0+
- Git
- OpenSSL (para generación de certificados)
- Un servidor Linux (Ubuntu 20.04+ / Debian 11+ recomendado)

### Puertos Necesarios
- **80** (HTTP - redirige a HTTPS)
- **443** (HTTPS)

---

## ⚙️ Configuración Inicial

### 1. Clonar el Repositorio

```bash
# Crear directorio de producción
sudo mkdir -p /opt/inthub
sudo chown $USER:$USER /opt/inthub

# Clonar repositorio
cd /opt/inthub
git clone <tu-repositorio> .
```

### 2. Estructura de Directorios

Verifica que tengas la siguiente estructura:

```
/opt/inthub/
├── backend/
│   ├── .env.production      # Configurar variables
│   └── data/                # Se creará automáticamente
├── docker/
│   └── nginx/
│       ├── conf.d/
│       │   └── site.conf   # Actualizar dominio
│       └── logs/           # Logs de nginx
├── certs/                  # Crear y agregar certificados
├── .env.production         # Configurar variables
├── docker-compose.yml
├── Dockerfile
└── deploy.sh / deploy.bat
```

---

## 🔐 Certificados SSL

### Opción 1: Certificados Let's Encrypt (Producción Recomendada)

```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Obtener certificados
sudo certbot certonly --standalone -d tu-dominio.com

# Copiar certificados al proyecto
mkdir -p certs
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem certs/
sudo chown $USER:$USER certs/*.pem
```

### Opción 2: Certificados Auto-firmados (Solo Desarrollo/Testing)

```bash
# Crear carpeta
mkdir -p certs

# Generar certificado auto-firmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=tu-dominio.com"
```

⚠️ **Importante**: Los navegadores mostrarán advertencias con certificados auto-firmados.

---

## 🔑 Variables de Entorno

### 1. Configurar `.env.production` (Raíz del Proyecto)

```bash
# Copiar ejemplo
cp .env.example .env.production

# Editar
nano .env.production
```

Actualizar:
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://tu-dominio.com
NEXT_PUBLIC_WS_URL=wss://tu-dominio.com
```

### 2. Configurar `backend/.env.production`

```bash
# Editar
nano backend/.env.production
```

**Generar claves seguras:**

```bash
# Generar ENCRYPTION_KEY
openssl rand -hex 32

# Generar JWT_SECRET
openssl rand -hex 32
```

Actualizar el archivo:

```bash
# Usar las claves generadas arriba
ENCRYPTION_KEY=<clave-generada-encryption>
JWT_SECRET=<clave-generada-jwt>

PORT=4000
DATABASE_PATH=/app/data/firewalls.db
NODE_ENV=production
SECURE_COOKIES=true
COOKIE_DOMAIN=tu-dominio.com
ALLOWED_ORIGINS=https://tu-dominio.com
SSH_TIMEOUT=30000
REQUEST_TIMEOUT=60000
```

### 3. Actualizar Configuración de NGINX

```bash
nano docker/nginx/conf.d/site.conf
```

Cambiar `your-domain.com` por tu dominio real en ambos bloques `server_name`.

---

## 🐳 Deploy con Docker

### Método Automático (Recomendado)

#### Linux/Mac:
```bash
# Dar permisos de ejecución
chmod +x deploy.sh

# Ejecutar deploy
./deploy.sh
```

#### Windows:
```cmd
deploy.bat
```

### Método Manual

```bash
# 1. Detener contenedores existentes
docker-compose down

# 2. Build de las imágenes
docker-compose build --no-cache

# 3. Iniciar servicios
docker-compose up -d

# 4. Ver logs
docker-compose logs -f
```

---

## ✅ Verificación

### 1. Verificar Contenedores

```bash
docker-compose ps
```

Deberías ver algo como:
```
NAME                    STATUS              PORTS
pfsense-hub-app         Up (healthy)        
pfsense-hub-nginx       Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 2. Verificar Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Solo app
docker-compose logs -f app

# Solo nginx
docker-compose logs -f nginx
```

### 3. Prueba de Conectividad

```bash
# Verificar HTTP (debe redirigir a HTTPS)
curl -I http://tu-dominio.com

# Verificar HTTPS
curl -I https://tu-dominio.com

# Verificar health check
curl https://tu-dominio.com/health
```

### 4. Acceder a la Aplicación

Abre tu navegador y ve a:
```
https://tu-dominio.com
```

**Credenciales por defecto** (¡CAMBIAR INMEDIATAMENTE!):
- Usuario: `admin`
- Contraseña: `admin123`

---

## 🔧 Mantenimiento

### Actualizar la Aplicación

```bash
# 1. Hacer pull de los cambios
git pull origin main

# 2. Rebuild y restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ver Estado de los Servicios

```bash
docker-compose ps
```

### Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose restart

# Reiniciar solo app
docker-compose restart app

# Reiniciar solo nginx
docker-compose restart nginx
```

### Detener Servicios

```bash
docker-compose down
```

### Backup de la Base de Datos

```bash
# El volumen de datos se encuentra en Docker
docker volume ls | grep app-data

# Backup
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

### Restaurar Backup

```bash
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup-YYYYMMDD.tar.gz -C /
```

---

## 🐛 Troubleshooting

### Problema: Contenedores no inician

**Solución:**
```bash
# Ver logs detallados
docker-compose logs

# Verificar configuración
docker-compose config
```

### Problema: Error de permisos en base de datos

**Solución:**
```bash
# Verificar volúmenes
docker volume inspect newdevfree_app-data

# Recrear volumen si es necesario
docker-compose down -v
docker-compose up -d
```

### Problema: Error SSL/Certificados

**Solución:**
```bash
# Verificar que los certificados existen
ls -la certs/

# Verificar permisos
chmod 644 certs/fullchain.pem
chmod 600 certs/privkey.pem

# Verificar configuración de nginx
docker-compose exec nginx nginx -t
```

### Problema: WebSocket no conecta

**Solución:**
1. Verificar que nginx está configurado correctamente para WebSocket
2. Verificar que el backend está escuchando en puerto 4000
3. Revisar logs: `docker-compose logs -f app`

### Problema: Rate limiting (429 Too Many Requests)

**Solución:**
Ajustar los límites en `docker/nginx/conf.d/site.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
```

### Problema: Alto uso de memoria

**Solución:**
```bash
# Ver uso de recursos
docker stats

# Limitar memoria en docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 📊 Monitoreo

### Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Solo errores
docker-compose logs -f | grep ERROR

# Últimas 100 líneas
docker-compose logs --tail=100
```

### Verificar Salud de los Contenedores

```bash
docker-compose ps
docker inspect pfsense-hub-app --format='{{.State.Health.Status}}'
```

### Logs de NGINX

Los logs de nginx se guardan en `docker/nginx/logs/`:
- `access.log` - Logs de acceso
- `error.log` - Logs de errores

```bash
# Ver accesos
tail -f docker/nginx/logs/access.log

# Ver errores
tail -f docker/nginx/logs/error.log
```

---

## 🔒 Seguridad

### Checklist de Seguridad

- [ ] Cambiar contraseña de admin por defecto
- [ ] Generar ENCRYPTION_KEY y JWT_SECRET únicos
- [ ] Usar certificados SSL válidos
- [ ] Configurar firewall del servidor (UFW/iptables)
- [ ] Actualizar el sistema operativo regularmente
- [ ] Hacer backups periódicos de la base de datos
- [ ] Revisar logs regularmente
- [ ] Limitar acceso SSH al servidor
- [ ] Configurar fail2ban para proteger contra brute force

### Configurar Firewall (UFW)

```bash
# Instalar UFW
sudo apt-get install ufw

# Permitir SSH (importante!)
sudo ufw allow ssh

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

---

## 📞 Soporte

### Comandos Útiles de Diagnóstico

```bash
# Estado general
docker-compose ps

# Logs completos
docker-compose logs > logs-$(date +%Y%m%d).txt

# Inspeccionar contenedor
docker inspect pfsense-hub-app

# Ver configuración de red
docker network inspect newdevfree_pfsense-network

# Ver volúmenes
docker volume ls
```

---

## 📝 Notas Adicionales

### Renovar Certificados Let's Encrypt

Los certificados Let's Encrypt expiran cada 90 días. Configura renovación automática:

```bash
# Crear script de renovación
sudo nano /etc/cron.monthly/renew-certs.sh
```

Contenido:
```bash
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem /opt/inthub/certs/
cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem /opt/inthub/certs/
docker-compose -f /opt/inthub/docker-compose.yml restart nginx
```

```bash
# Dar permisos
sudo chmod +x /etc/cron.monthly/renew-certs.sh
```

### Escalar la Aplicación

Para entornos de alta carga, considera:
- Usar un load balancer (nginx/HAProxy)
- Escalar horizontalmente con múltiples instancias
- Usar Redis para sesiones compartidas
- Implementar caché (Varnish/CloudFlare)

---

## ✅ Deploy Completado

¡Felicitaciones! Tu aplicación pfSense Firewall Hub está ahora en producción.

**Próximos pasos:**
1. Accede a https://tu-dominio.com
2. Cambia la contraseña de admin
3. Agrega tus firewalls pfSense
4. Configura backups automáticos
5. Monitorea los logs regularmente

---

**Última actualización:** Enero 2026  
**Versión:** 1.0.0
