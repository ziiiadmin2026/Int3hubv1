# 📦 Pre-Deploy Checklist

## Antes de hacer el deploy en producción, verifica:

### ✅ Configuración de Seguridad

- [ ] **Claves generadas**: ENCRYPTION_KEY y JWT_SECRET en `backend/.env.production`
  ```bash
  # Generar con:
  openssl rand -hex 32
  ```

- [ ] **Contraseña de admin**: Cambiar inmediatamente después del primer login
  - Usuario: `admin`
  - Contraseña inicial: `admin123`

- [ ] **Certificados SSL**: Válidos y en carpeta `certs/`
  - `certs/fullchain.pem`
  - `certs/privkey.pem`

### ✅ Configuración de Variables

- [ ] **Dominio configurado** en `.env.production`:
  ```bash
  NEXT_PUBLIC_API_URL=https://tu-dominio.com
  NEXT_PUBLIC_WS_URL=wss://tu-dominio.com
  ```

- [ ] **Dominio configurado** en `backend/.env.production`:
  ```bash
  COOKIE_DOMAIN=tu-dominio.com
  ALLOWED_ORIGINS=https://tu-dominio.com
  ```

- [ ] **Dominio configurado** en `docker/nginx/conf.d/site.conf`:
  - Línea: `server_name your-domain.com;` (cambiar en ambos bloques)

### ✅ Infraestructura

- [ ] **Docker instalado**: Docker 20.10+ y Docker Compose 2.0+
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] **Puertos abiertos** en firewall:
  - Puerto 80 (HTTP)
  - Puerto 443 (HTTPS)

- [ ] **DNS configurado**: Dominio apuntando a la IP del servidor

### ✅ Archivos Requeridos

Verifica que existen:
- [ ] `.env.production`
- [ ] `backend/.env.production`
- [ ] `docker-compose.yml`
- [ ] `Dockerfile`
- [ ] `docker/nginx/conf.d/site.conf`
- [ ] `certs/fullchain.pem`
- [ ] `certs/privkey.pem`

### ✅ Servidor

- [ ] **Sistema actualizado**:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **Espacio en disco**: Mínimo 20GB disponible

- [ ] **Memoria RAM**: Mínimo 4GB

- [ ] **Firewall configurado** (UFW/iptables):
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow ssh
  sudo ufw enable
  ```

### ✅ Backup

- [ ] **Estrategia de backup** definida para `/app/backend/data/firewalls.db`

- [ ] **Script de backup** configurado (opcional pero recomendado)

### ✅ Testing

- [ ] **Prueba en entorno de staging** (si es posible)

- [ ] **Verificar conectividad SSH** a tus firewalls pfSense

### ✅ Documentación

- [ ] **PRODUCTION-DEPLOY.md** revisado

- [ ] **Credenciales anotadas** en lugar seguro

- [ ] **Contactos de soporte** disponibles

---

## 🚀 Si todo está marcado, procede con:

### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Windows:
```cmd
deploy.bat
```

---

## 📝 Post-Deploy

Una vez deployado, verifica:

- [ ] Acceso a https://tu-dominio.com
- [ ] Login funcional
- [ ] Cambiar contraseña de admin
- [ ] Agregar primer firewall de prueba
- [ ] Verificar logs: `docker-compose logs -f`
- [ ] Configurar monitoreo
- [ ] Programar backups automáticos

---

## ⚠️ En caso de problemas

Consulta [PRODUCTION-DEPLOY.md](PRODUCTION-DEPLOY.md) sección "Troubleshooting"

```bash
# Ver logs
docker-compose logs -f

# Ver estado
docker-compose ps

# Reintentar
docker-compose down
docker-compose up -d
```
