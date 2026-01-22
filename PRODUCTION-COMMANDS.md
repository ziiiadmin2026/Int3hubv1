# 🛠️ Comandos Útiles de Producción

Referencia rápida de comandos para gestionar tu aplicación en producción.

---

## 🚀 Deploy y Gestión

### Deploy Inicial
```bash
# Ir al directorio de producción
cd /opt/inthub

# Verificar configuración
./verify-deploy.sh          # Linux/Mac
verify-deploy.bat           # Windows

# Deploy
./deploy.sh                 # Linux/Mac
deploy.bat                  # Windows
```

### Actualizar Aplicación
```bash
# Ir al directorio de producción
cd /opt/inthub

# Pull cambios del repositorio
git pull origin main

# Rebuild y redeploy
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Redeploy Rápido (sin rebuild)
```bash
docker-compose restart
```

---

## 📊 Monitoreo y Estado

### Ver Estado de Servicios
```bash
# Estado de todos los contenedores
docker-compose ps

# Ver solo contenedores en ejecución
docker ps

# Estado detallado de un contenedor
docker inspect pfsense-hub-app
```

### Ver Logs
```bash
# Logs de todos los servicios (follow)
docker-compose logs -f

# Logs solo de la app
docker-compose logs -f app

# Logs solo de nginx
docker-compose logs -f nginx

# Últimas 100 líneas
docker-compose logs --tail=100

# Logs desde una fecha
docker-compose logs --since "2026-01-20T10:00:00"

# Logs de nginx del sistema de archivos
tail -f docker/nginx/logs/access.log
tail -f docker/nginx/logs/error.log
```

### Métricas de Recursos
```bash
# CPU, memoria, red, I/O de todos los contenedores
docker stats

# Métricas de un contenedor específico
docker stats pfsense-hub-app

# Ver uso de disco
df -h
docker system df
```

### Health Checks
```bash
# Estado de salud de la app
docker inspect pfsense-hub-app --format='{{.State.Health.Status}}'

# Estado de salud de nginx
docker inspect pfsense-hub-nginx --format='{{.State.Health.Status}}'

# Verificar endpoint de health
curl https://tu-dominio.com/health
curl http://localhost/health
```

---

## 🔄 Control de Servicios

### Iniciar Servicios
```bash
# Iniciar todos los servicios
docker-compose up -d

# Iniciar solo un servicio
docker-compose up -d app
docker-compose up -d nginx
```

### Detener Servicios
```bash
# Detener todos los servicios
docker-compose down

# Detener sin eliminar volúmenes
docker-compose stop

# Detener un servicio específico
docker-compose stop app
```

### Reiniciar Servicios
```bash
# Reiniciar todos
docker-compose restart

# Reiniciar uno específico
docker-compose restart app
docker-compose restart nginx
```

### Recrear Servicios
```bash
# Recrear todos (útil después de cambios en docker-compose.yml)
docker-compose up -d --force-recreate

# Recrear solo app
docker-compose up -d --force-recreate app
```

---

## 🐛 Debugging

### Entrar a un Contenedor
```bash
# Shell en el contenedor de app
docker-compose exec app sh

# Shell en nginx
docker-compose exec nginx sh

# Como root (si es necesario)
docker-compose exec --user root app sh
```

### Verificar Configuración
```bash
# Verificar docker-compose.yml
docker-compose config

# Verificar sintaxis de nginx
docker-compose exec nginx nginx -t

# Recargar configuración de nginx sin downtime
docker-compose exec nginx nginx -s reload
```

### Ver Variables de Entorno
```bash
# Variables de entorno del contenedor
docker-compose exec app env

# Variables específicas
docker-compose exec app sh -c 'echo $NODE_ENV'
docker-compose exec app sh -c 'echo $PORT'
```

### Ver Procesos en Contenedor
```bash
# Procesos en la app
docker-compose exec app ps aux

# Top de procesos
docker top pfsense-hub-app
```

---

## 💾 Base de Datos

### Ver Contenido de la Base de Datos
```bash
# Entrar a sqlite
docker-compose exec app sh
cd /app/backend/data
sqlite3 firewalls.db

# Comandos sqlite
.tables                  # Ver tablas
.schema firewalls        # Ver estructura de tabla
SELECT * FROM firewalls; # Ver todos los firewalls
.quit                    # Salir
```

### Backup de Base de Datos
```bash
# Backup del volumen completo
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/db-backup-$(date +%Y%m%d-%H%M%S).tar.gz /data

# Backup solo del archivo DB
docker cp pfsense-hub-app:/app/backend/data/firewalls.db \
  ./backup-$(date +%Y%m%d).db
```

### Restaurar Base de Datos
```bash
# Desde backup completo
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/db-backup-YYYYMMDD-HHMMSS.tar.gz -C /

# Desde archivo DB
docker cp ./backup-YYYYMMDD.db \
  pfsense-hub-app:/app/backend/data/firewalls.db

# Reiniciar app
docker-compose restart app
```

### Resetear Base de Datos
```bash
# Detener app
docker-compose stop app

# Eliminar BD (perderás todos los datos!)
docker-compose exec app rm /app/backend/data/firewalls.db

# Reiniciar (se creará nueva BD)
docker-compose start app
```

---

## 🔐 Certificados SSL

### Ver Información de Certificados
```bash
# Ver certificado
openssl x509 -in certs/fullchain.pem -text -noout

# Ver fecha de expiración
openssl x509 -in certs/fullchain.pem -noout -dates

# Verificar certificado y clave coinciden
openssl x509 -noout -modulus -in certs/fullchain.pem | openssl md5
openssl rsa -noout -modulus -in certs/privkey.pem | openssl md5
```

### Renovar Certificados Let's Encrypt
```bash
# Detener nginx temporalmente
docker-compose stop nginx

# Renovar certificado
sudo certbot renew

# Copiar certificados nuevos
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem certs/
sudo chown $USER:$USER certs/*.pem

# Reiniciar nginx
docker-compose start nginx
```

### Generar Certificados Auto-firmados
```bash
./generate-certs.sh tu-dominio.com    # Linux/Mac
generate-certs.bat tu-dominio.com     # Windows
```

---

## 🧹 Limpieza y Mantenimiento

### Limpiar Logs
```bash
# Limpiar logs de nginx
> docker/nginx/logs/access.log
> docker/nginx/logs/error.log

# O con truncate
truncate -s 0 docker/nginx/logs/access.log
truncate -s 0 docker/nginx/logs/error.log
```

### Limpiar Docker
```bash
# Limpiar contenedores detenidos
docker container prune -f

# Limpiar imágenes no usadas
docker image prune -f

# Limpiar volúmenes no usados (¡CUIDADO!)
docker volume prune -f

# Limpiar todo (excepto volúmenes)
docker system prune -f

# Limpiar TODO incluyendo volúmenes (¡PERDERÁS DATOS!)
docker system prune -a --volumes -f
```

### Ver Uso de Espacio
```bash
# Espacio usado por Docker
docker system df

# Espacio detallado
docker system df -v

# Espacio en disco del sistema
df -h
```

---

## 🔍 Inspección y Diagnóstico

### Verificar Conectividad

```bash
# Desde el host al contenedor
curl http://localhost:3000
curl http://localhost:4000/api/health

# Desde fuera
curl https://tu-dominio.com
curl https://tu-dominio.com/api/health
curl https://tu-dominio.com/health

# Verificar WebSocket
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://tu-dominio.com/socket.io/
```

### Verificar Puertos
```bash
# Ver puertos en uso
netstat -tulpn | grep -E ':(80|443|3000|4000)'

# Ver qué está escuchando en un puerto
lsof -i :80
lsof -i :443
```

### Verificar Red de Docker
```bash
# Ver redes
docker network ls

# Inspeccionar red
docker network inspect newdevfree_pfsense-network

# Ver IP de contenedores
docker inspect pfsense-hub-app --format='{{.NetworkSettings.Networks.newdevfree_pfsense-network.IPAddress}}'
```

### Verificar Volúmenes
```bash
# Listar volúmenes
docker volume ls

# Inspeccionar volumen
docker volume inspect newdevfree_app-data

# Ver contenido de volumen
docker run --rm -v newdevfree_app-data:/data alpine ls -la /data
```

---

## 🚨 Troubleshooting

### Contenedor No Inicia
```bash
# Ver por qué falló
docker-compose logs app

# Ver eventos del contenedor
docker events --filter container=pfsense-hub-app

# Inspeccionar estado
docker inspect pfsense-hub-app --format='{{.State.Status}}'
docker inspect pfsense-hub-app --format='{{.State.Error}}'
```

### Alto Uso de CPU/Memoria
```bash
# Ver procesos en el contenedor
docker top pfsense-hub-app

# Ver recursos en tiempo real
docker stats pfsense-hub-app

# Entrar y diagnosticar
docker-compose exec app sh
top
ps aux
```

### Error 502 Bad Gateway
```bash
# Verificar que app esté corriendo
docker-compose ps app

# Ver logs de app
docker-compose logs app

# Ver logs de nginx
docker-compose logs nginx

# Verificar conectividad interna
docker-compose exec nginx wget -qO- http://app:3000
```

### Base de Datos Corrupta
```bash
# Verificar integridad
docker-compose exec app sh -c 'sqlite3 /app/backend/data/firewalls.db "PRAGMA integrity_check;"'

# Si está corrupta, restaurar backup
# Ver sección "Restaurar Base de Datos" arriba
```

---

## 📈 Performance

### Ver Métricas de NGINX
```bash
# Requests por segundo (últimos 60 segundos)
docker-compose exec nginx sh -c 'tail -n 1000 /var/log/nginx/access.log | grep "$(date +"%d/%b/%Y:%H:%M")" | wc -l'

# Ver IPs más activas
docker-compose exec nginx sh -c 'awk "{print \$1}" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10'

# Ver URLs más solicitadas
docker-compose exec nginx sh -c 'awk "{print \$7}" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10'
```

### Ver Métricas de Docker
```bash
# CPU y memoria
docker stats --no-stream

# Tamaño de contenedores
docker ps -s
```

---

## 🔧 Configuración en Caliente

### Recargar NGINX sin Downtime
```bash
# Verificar configuración
docker-compose exec nginx nginx -t

# Recargar
docker-compose exec nginx nginx -s reload
```

### Variables de Entorno (requiere reinicio)
```bash
# Editar .env.production o backend/.env.production
nano .env.production

# Recrear contenedor para aplicar cambios
docker-compose up -d --force-recreate app
```

---

## 📝 Logs Avanzados

### Filtrar Logs
```bash
# Solo errores
docker-compose logs app | grep -i error

# Solo warnings
docker-compose logs app | grep -i warning

# Buscar texto específico
docker-compose logs app | grep "SSH connection"

# Con timestamp
docker-compose logs -t app
```

### Exportar Logs
```bash
# Exportar logs a archivo
docker-compose logs > logs-$(date +%Y%m%d).txt

# Logs con fecha
docker-compose logs --since "2026-01-20" > logs-recent.txt

# Solo errores a archivo
docker-compose logs app 2>&1 | grep -i error > errors.log
```

---

## 🎯 Comandos de Producción Críticos

### Reinicio de Emergencia
```bash
docker-compose down && docker-compose up -d
```

### Ver Todo el Estado
```bash
docker-compose ps && \
docker stats --no-stream && \
docker-compose logs --tail=20
```

### Backup Completo Rápido
```bash
docker run --rm -v newdevfree_app-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz /data
```

---

**Tip:** Crea aliases en tu `~/.bashrc` o `~/.zshrc` para comandos frecuentes:

```bash
alias dcp='docker-compose ps'
alias dcl='docker-compose logs -f'
alias dcr='docker-compose restart'
alias dcd='docker-compose down'
alias dcu='docker-compose up -d'
```

---

**Última actualización:** Enero 2026
