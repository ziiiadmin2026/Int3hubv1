# 🏗️ Arquitectura de Producción

## Diagrama de Infraestructura

```
Internet
   |
   | HTTPS (443)
   | HTTP (80) → redirect HTTPS
   ↓
┌──────────────────────────────────────┐
│         NGINX Reverse Proxy          │
│  - SSL/TLS Termination               │
│  - Rate Limiting                     │
│  - Security Headers                  │
│  - Load Balancing                    │
└──────────────────────────────────────┘
   |                    |
   | Frontend           | Backend/WebSocket
   | (port 3000)        | (port 4000)
   ↓                    ↓
┌──────────────────────────────────────┐
│       Docker Container: app          │
│                                      │
│  ┌────────────────┐  ┌────────────┐ │
│  │  Next.js       │  │  Express   │ │
│  │  Frontend      │  │  + Socket.io│ │
│  │  (Port 3000)   │  │  (Port 4000)│ │
│  └────────────────┘  └────────────┘ │
│                           |          │
│                           ↓          │
│                    ┌────────────┐    │
│                    │  SQLite DB │    │
│                    │  (Encrypted)│   │
│                    └────────────┘    │
└──────────────────────────────────────┘
                       |
                       | SSH
                       ↓
              ┌─────────────────┐
              │ pfSense Firewalls│
              │  - FW1: 10.0.0.1│
              │  - FW2: 10.0.0.2│
              │  - FW3: ...     │
              └─────────────────┘
```

## Flujo de Datos

### 1. Petición del Usuario

```
Usuario (Browser)
   ↓
   HTTPS (443)
   ↓
NGINX
   ↓
   ├─→ / (root, assets) → Next.js Frontend (3000)
   ├─→ /api/*          → Express Backend (4000)
   └─→ /socket.io/*    → Socket.io WebSocket (4000)
```

### 2. Autenticación

```
Login Request
   ↓
NGINX (Rate Limited: 5 req/min)
   ↓
Express Backend
   ↓
Verify Credentials (bcrypt)
   ↓
Generate JWT
   ↓
Set Secure Cookie
   ↓
Return to Frontend
```

### 3. Conexión SSH a Firewall

```
Frontend Request
   ↓
WebSocket Connection (Socket.io)
   ↓
Backend SSH Manager
   ↓
Decrypt Credentials (AES-256)
   ↓
SSH2 Connection
   ↓
pfSense Firewall
   ↓
Execute Commands
   ↓
Stream Output (WebSocket)
   ↓
Frontend Display (Real-time)
```

## Componentes

### Frontend (Next.js)
- **Puerto:** 3000 (interno)
- **Tecnologías:** React, Next.js, Tailwind CSS, Socket.io-client
- **Responsabilidades:**
  - UI/UX
  - Estado de la aplicación
  - Comunicación con backend
  - WebSocket real-time updates

### Backend (Express + Socket.io)
- **Puerto:** 4000 (interno)
- **Tecnologías:** Express, Socket.io, SSH2, SQLite, bcrypt
- **Responsabilidades:**
  - API REST
  - WebSocket server
  - Gestión SSH
  - Encriptación/Desencriptación
  - Autenticación JWT
  - Base de datos

### NGINX
- **Puertos:** 80 (HTTP), 443 (HTTPS)
- **Responsabilidades:**
  - SSL/TLS termination
  - Reverse proxy
  - Rate limiting
  - Security headers
  - Static asset caching
  - WebSocket proxying

### Base de Datos (SQLite)
- **Ubicación:** `/app/backend/data/firewalls.db`
- **Encriptación:** AES-256-CBC
- **Persistencia:** Docker volume `app-data`
- **Tablas:**
  - `users` - Usuarios autenticados
  - `firewalls` - Configuración de firewalls
  - `credentials` - Credenciales SSH encriptadas

## Seguridad en Capas

```
Layer 1: Network
├── Firewall rules (UFW/iptables)
├── Only ports 80, 443, 22 exposed
└── Rate limiting at NGINX level

Layer 2: SSL/TLS
├── HTTPS enforced
├── TLS 1.2, 1.3 only
├── Strong cipher suites
└── HSTS headers

Layer 3: Application
├── JWT authentication
├── Secure cookies (httpOnly, secure, sameSite)
├── CORS configured
└── Input validation

Layer 4: Data
├── Credentials encrypted at rest (AES-256)
├── Password hashing (bcrypt)
├── Environment variables
└── No sensitive data in logs

Layer 5: Container
├── Non-root user
├── Read-only file systems
├── Limited resources
└── Health checks
```

## Escalabilidad

### Actual (Single Server)
```
1 Server
  └── Docker Compose
      ├── 1x app container
      └── 1x nginx container
```

### Futuro (Escalado Horizontal)
```
Load Balancer
  ↓
┌────────────┬────────────┬────────────┐
│  Server 1  │  Server 2  │  Server 3  │
│  ├─ app    │  ├─ app    │  ├─ app    │
│  └─ nginx  │  └─ nginx  │  └─ nginx  │
└────────────┴────────────┴────────────┘
         ↓           ↓           ↓
    ┌────────────────────────────┐
    │  Shared Database (Redis)   │
    │  Shared Storage (NFS/S3)   │
    └────────────────────────────┘
```

## Volúmenes y Persistencia

```
Docker Host
  ↓
Volume: app-data
  └── /app/backend/data/
      └── firewalls.db (SQLite)

Volume: nginx-certs
  └── /etc/ssl/private/
      ├── fullchain.pem
      └── privkey.pem

Mount: nginx-logs
  └── ./docker/nginx/logs/
      ├── access.log
      └── error.log
```

## Health Checks

### App Container
```yaml
healthcheck:
  test: HTTP GET http://localhost:3000
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### NGINX Container
```yaml
healthcheck:
  test: HTTP GET http://localhost/health
  interval: 30s
  timeout: 10s
  retries: 3
```

## Monitoreo

### Logs
```
docker-compose logs -f app     # Application logs
docker-compose logs -f nginx   # NGINX logs
tail -f docker/nginx/logs/access.log
tail -f docker/nginx/logs/error.log
```

### Métricas
```
docker stats                   # CPU, Memory, Network
docker ps                      # Container status
docker inspect <container>     # Detailed info
```

### Health
```
curl https://tu-dominio.com/health
docker inspect app --format='{{.State.Health.Status}}'
```

## Backup y Recovery

### Backup
```bash
# Database backup
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Full backup (incluye configs)
tar czf backup-full-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  .env.production \
  backend/.env.production \
  docker/nginx/conf.d/ \
  certs/
```

### Recovery
```bash
# Restore database
docker run --rm \
  -v newdevfree_app-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup-YYYYMMDD.tar.gz -C /

# Restart services
docker-compose restart
```

## Performance

### NGINX
- Gzip compression
- Static asset caching (1 year)
- Connection pooling
- Keep-alive connections

### Docker
- Multi-stage builds (smaller images)
- Layer caching
- Minimal base images (alpine)
- Resource limits

### Application
- Next.js optimizations
- Code splitting
- Image optimization
- API response caching

## Límites y Quotas

### Rate Limiting
```nginx
API endpoints:    10 req/s (burst: 20)
Login endpoint:   5 req/min (burst: 3)
```

### Timeouts
```
SSH Connection:   30s
HTTP Request:     60s
WebSocket:        7 days
```

### Resource Limits (Ejemplo)
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Actualizaciones

### Rolling Update
```bash
# 1. Pull latest code
git pull origin main

# 2. Build new image
docker-compose build --no-cache app

# 3. Recreate containers
docker-compose up -d --no-deps app

# 4. Verify
docker-compose ps
docker-compose logs -f app
```

### Zero-Downtime Update
Para actualizaciones sin downtime, necesitarías:
1. Load balancer
2. Múltiples instancias de app
3. Blue-Green deployment strategy

---

## Resumen

**Fortalezas:**
- ✅ Arquitectura simple y robusta
- ✅ Fácil de mantener
- ✅ Seguridad en múltiples capas
- ✅ Logs y monitoreo
- ✅ Backup y recovery
- ✅ Escalable (con ajustes)

**Limitaciones Actuales:**
- ⚠️ Single point of failure
- ⚠️ No load balancing
- ⚠️ Manual scaling

**Mejoras Futuras:**
- 🔄 Load balancer (HAProxy/nginx)
- 🔄 Multiple app instances
- 🔄 Redis for session storage
- 🔄 Prometheus + Grafana monitoring
- 🔄 Automated backups
- 🔄 CI/CD pipeline

---

**Última actualización:** Enero 2026
