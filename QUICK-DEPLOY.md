# 🚀 Quick Start - Production Deployment

## Deploy en 5 Minutos

### 0. Preparar Directorio

```bash
# Crear y preparar directorio de producción
sudo mkdir -p /opt/inthub
sudo chown $USER:$USER /opt/inthub
cd /opt/inthub

# Clonar proyecto (si aún no está)
git clone <tu-repositorio> .
```

### 1. Generar Claves de Seguridad

```bash
# Linux/Mac
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

```powershell
# Windows PowerShell
$encKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "ENCRYPTION_KEY=$encKey"
Write-Host "JWT_SECRET=$jwtSecret"
```

### 2. Configurar Variables de Entorno

Edita `backend/.env.production` y pega las claves generadas:

```bash
ENCRYPTION_KEY=<tu-clave-generada>
JWT_SECRET=<tu-jwt-secret-generado>
PORT=4000
DATABASE_PATH=/app/data/firewalls.db
NODE_ENV=production
COOKIE_DOMAIN=tu-dominio.com
ALLOWED_ORIGINS=https://tu-dominio.com
```

Edita `.env.production`:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://tu-dominio.com
NEXT_PUBLIC_WS_URL=wss://tu-dominio.com
```

### 3. Configurar Dominio en NGINX

Edita `docker/nginx/conf.d/site.conf` y reemplaza `your-domain.com` con tu dominio.

### 4. Agregar Certificados SSL

#### Opción A: Certificados Reales (Producción)
```bash
mkdir -p certs
# Copiar tus certificados
cp /ruta/a/fullchain.pem certs/
cp /ruta/a/privkey.pem certs/
```

#### Opción B: Certificados Auto-firmados (Testing)
```bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -subj "/CN=tu-dominio.com"
```

### 5. Deploy

#### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Windows:
```cmd
deploy.bat
```

### 6. Verificar

```bash
docker-compose ps
```

Accede a: **https://tu-dominio.com**

---

## Checklist Rápido

- [ ] Claves generadas en `backend/.env.production`
- [ ] Dominio configurado en `.env.production`
- [ ] Dominio configurado en `docker/nginx/conf.d/site.conf`
- [ ] Certificados SSL en carpeta `certs/`
- [ ] Ejecutar `deploy.sh` o `deploy.bat`
- [ ] Cambiar contraseña de admin (user: admin, pass: admin123)

---

## Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down

# Ver estado
docker-compose ps
```

---

**Para más detalles, consulta [PRODUCTION-DEPLOY.md](PRODUCTION-DEPLOY.md)**
