# 🛡️ Arquitectura de Seguridad

## Flujo de Credenciales SSH

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│  - Nunca almacena credenciales                                  │
│  - Solo envía credenciales al conectar                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
         WebSocket / REST API
                 │
┌────────────────▼────────────────────────────────────────────────┐
│              BACKEND (Express + Node.js)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Recibe credenciales del formulario                    │  │
│  │ 2. Encripta password/key con AES-256-CBC                │  │
│  │ 3. Guarda en BD SQLite                                   │  │
│  │ 4. NUNCA retorna credenciales desencriptadas al frontend│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  🔑 ENCRYPTION_KEY (desde .env)                                │
│     └─> Genera hash SHA256 para AES-256                        │
│     └─> IV aleatorio por cada credencial                       │
└────────────────┬───────────────────────────────────────────────┘
                 │
         SSH Connection (Port 22/custom)
                 │
┌────────────────▼────────────────────────────────────────────────┐
│              FIREWALL pfSense                                   │
│  - Recibe comandos del backend                                  │
│  - Retorna métricas del sistema                                 │
└─────────────────────────────────────────────────────────────────┘
                 │
         SSH Output (no sensible)
                 │
┌────────────────▼────────────────────────────────────────────────┐
│              BACKEND (Process)                                  │
│  - Parsea output SSH (uptime, memory, etc.)                    │
│  - Guarda summary en BD (no encriptado)                        │
│  - Retorna al frontend                                         │
└────────────────┬───────────────────────────────────────────────┘
                 │
         REST API Response
                 │
┌────────────────▼────────────────────────────────────────────────┐
│              FRONTEND (Display)                                 │
│  - Muestra métricas del firewall                               │
│  - Status: online/offline                                      │
│  - NO TIENE acceso a credenciales                              │
└─────────────────────────────────────────────────────────────────┘
```

## Almacenamiento en Base de Datos

### Tabla: `firewalls`

```sql
CREATE TABLE firewalls (
  id TEXT PRIMARY KEY,
  name TEXT,              -- ✅ Plano (nombre visible)
  ip TEXT,                -- ✅ Plano (IP visible)
  port INTEGER,           -- ✅ Plano (puerto visible)
  user TEXT,              -- ✅ Plano (usuario visible)
  password TEXT,          -- 🔒 ENCRIPTADO (AES-256)
  key TEXT,               -- 🔒 ENCRIPTADO (AES-256)
  status TEXT,            -- ✅ Plano (online/offline)
  summary TEXT,           -- ✅ Plano (JSON con métricas)
  lastSeen INTEGER,       -- ✅ Plano (timestamp)
  createdAt INTEGER,      -- ✅ Plano (timestamp)
  updatedAt INTEGER       -- ✅ Plano (timestamp)
);
```

### Ejemplo de Registro Encriptado

```
password: "iv_hex:cipher_hex"

Ejemplo real:
"a7f3b2e1d4c9e2f1a8b3c4d5e6f7a8b9:9f8e7d6c5b4a3f2e1d9c8b7a6f5e4d3c2b1a9f8e7d6c5b4a3f2e1d9c8b7a"
       └─ IV aleatorio ──────┘  └─ Cipher encriptado ─────────────────────────────────┘
```

**Encriptación:**
- IV: 16 bytes aleatorios por credencial
- Cipher: AES-256-CBC
- Key: SHA256(ENCRYPTION_KEY)

## Variables de Entorno

### Desarrollo (`backend/.env`)

```env
ENCRYPTION_KEY=dev-key-cambiar-en-produccion
PORT=4000
DATABASE_PATH=./data/firewalls.db
```

### Producción (Secrets Manager)

```bash
# AWS
aws secretsmanager create-secret --name pfsense-encryption-key \
  --secret-string "clave-super-fuerte-de-produccion"

# Azure
az keyvault secret set --vault-name my-vault \
  --name encryption-key \
  --value "clave-super-fuerte-de-produccion"

# Vercel/Railway (UI)
ENCRYPTION_KEY = ••••••••••••••••••
PORT = 4000
DATABASE_PATH = /data/firewalls.db
```

## API Security

### Request/Response Cycle

```javascript
// REQUEST: Frontend envía credenciales
POST /api/firewalls
{
  id: "12345",
  name: "Mi Firewall",
  host: "192.168.1.1",
  port: 22,
  user: "admin",
  password: "secret123",    // ← AQUI SE ENCRIPTA
  key: null
}

// RESPONSE: Backend retorna sin credenciales
{
  id: "12345",
  name: "Mi Firewall",
  ip: "192.168.1.1",        // ✅ IP visible
  port: 22,                 // ✅ Puerto visible
  user: "admin",            // ✅ Usuario visible
  password: undefined,      // ❌ NUNCA en response
  key: undefined,           // ❌ NUNCA en response
  status: "offline",
  summary: null,
  lastSeen: null
}
```

### GET /api/firewalls

```javascript
// RETORNA: Todos sin credenciales desencriptadas
[
  {
    id: "1769031914182",
    name: "Grupo Alzen",
    ip: "189.192.233.118",
    port: 10022,
    user: "admin",
    status: "online",
    summary: { /* métricas */ },
    lastSeen: 1769032179071,
    createdAt: 1769031914193,
    updatedAt: 1769032179082
  }
]
// ❌ password y key NO incluidas
```

## SSH Connection Security

### Conectar a Firewall

```javascript
// Backend (NUNCA expuesto)
const conn = new Client();
conn.exec(commands, (err, stream) => {
  // Ejecuta comandos: uname, uptime, ifconfig, etc.
  // Retorna solo output sin credenciales
});
```

### Frontend (WebSocket para logs en vivo)

```javascript
// Solo durante test de conexión (opcional)
socket.emit('ssh-connect', {
  host: form.host,
  port: form.port,
  user: form.user,
  password: form.password,  // Temporal, solo para test
  command: "uname -a"
});

// Logs recibidos (no contienen credenciales)
socket.on('ssh-log', (log) => {
  console.log(log); // "FreeBSD v12..."
});

// Después del test, credenciales se guardan en BD
// Frontend NUNCA las almacena
```

## Checklist de Seguridad

- ✅ `.env` en `.gitignore` - no se commitea
- ✅ `.env.example` en repo - muestra estructura
- ✅ Credenciales encriptadas AES-256
- ✅ IV único por credencial
- ✅ API no retorna passwords
- ✅ Frontend no almacena credenciales
- ✅ BD local está en `.gitignore` (en .data/)
- ✅ SSH connection cifrada (SSL/TLS)
- ✅ Secrets Manager en producción
- ✅ Logging sin exponer credenciales

## Cambiar ENCRYPTION_KEY

⚠️ **DESTRUCTIVO**: Invalida todas las credenciales guardadas

**Si es necesario:**

```bash
# 1. Backup
cp backend/data/firewalls.db backend/data/firewalls.db.backup

# 2. Eliminar BD
rm backend/data/firewalls.db

# 3. Cambiar ENCRYPTION_KEY en .env
ENCRYPTION_KEY=nueva-clave-fuerte

# 4. Reiniciar
npm run dev

# 5. Re-agregar firewalls
```

---

**Última actualización**: Enero 2026
