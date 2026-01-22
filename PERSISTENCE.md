# Persistencia de Datos con SQLite + Encriptación

## ✅ Implementado

Tu sistema ahora tiene **persistencia robusta** con:
- ✅ Base de datos SQLite local (`backend/data/firewalls.db`)
- ✅ Encriptación AES-256 de credenciales
- ✅ API REST para CRUD
- ✅ Carga automática al iniciar
- ✅ Guardado automático en cada cambio

---

## 🏗️ Arquitectura

```
Frontend (React)
    ↓
API REST (Express)
    ↓
SQLite Database (Encrypted)
    ↓
Local Disk Storage
```

### Flujo de Datos

**Agregar Firewall:**
```
Modal Form → API POST /api/firewalls 
  → db.addFirewall() 
  → Encripta credenciales (AES-256)
  → Guarda en BD
  → Retorna credenciales desencriptadas
```

**Cargar Firewalls:**
```
App Inicia → useEffect(() => loadFirewalls())
  → API GET /api/firewalls
  → db.getAllFirewalls()
  → Desencripta cada credencial
  → Estado React actualizado
  → UI muestra firewalls
```

---

## 🔒 Seguridad

### Encriptación
- **Algoritmo**: AES-256-CBC
- **IV**: Aleatorio por cada credencial
- **Clave**: Generada del ENCRYPTION_KEY

### Almacenamiento
```
password: "micontraseña"
↓ (encrypt)
"a1b2c3d4e5f6:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a"
↓ (guardado en BD)
SQLite
```

### Recuperación
```
BD: "a1b2c3d4e5f6:9f8e7d..."
↓ (decrypt)
"micontraseña"
↓ (enviado a SSH)
```

---

## 📊 Base de Datos

### Tabla `firewalls`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT (PK) | ID único (timestamp) |
| `name` | TEXT | Nombre del firewall |
| `ip` | TEXT | IP/dominio |
| `port` | INTEGER | Puerto SSH (defecto 22) |
| `user` | TEXT | Usuario SSH |
| `password` | TEXT | Contraseña encriptada |
| `key` | TEXT | Clave privada encriptada |
| `status` | TEXT | 'online' o 'offline' |
| `summary` | TEXT | JSON con métricas |
| `lastSeen` | INTEGER | Timestamp último contacto |
| `createdAt` | INTEGER | Timestamp creación |
| `updatedAt` | INTEGER | Timestamp última actualización |

### Tabla `settings`

Reservada para futuras configuraciones.

---

## 🔌 API Endpoints

### GET `/api/firewalls`
Obtener todos los firewalls
```bash
curl http://localhost:4000/api/firewalls
```
**Response:**
```json
[
  {
    "id": "1705862400000",
    "name": "Router-Main",
    "ip": "10.0.0.1",
    "port": 22,
    "user": "admin",
    "password": "micontraseña",
    "key": "",
    "status": "online",
    "summary": { ... },
    "lastSeen": 1705862450000,
    "createdAt": 1705862400000,
    "updatedAt": 1705862450000
  }
]
```

### GET `/api/firewalls/:id`
Obtener un firewall específico
```bash
curl http://localhost:4000/api/firewalls/1705862400000
```

### POST `/api/firewalls`
Crear nuevo firewall
```bash
curl -X POST http://localhost:4000/api/firewalls \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1705862400000",
    "name": "Router-Main",
    "host": "10.0.0.1",
    "port": 22,
    "user": "admin",
    "password": "micontraseña",
    "key": ""
  }'
```

### PUT `/api/firewalls/:id`
Actualizar firewall
```bash
curl -X PUT http://localhost:4000/api/firewalls/1705862400000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Router-Updated",
    "status": "online"
  }'
```

### DELETE `/api/firewalls/:id`
Eliminar firewall
```bash
curl -X DELETE http://localhost:4000/api/firewalls/1705862400000
```

### PATCH `/api/firewalls/:id/status`
Actualizar estado y métricas
```bash
curl -X PATCH http://localhost:4000/api/firewalls/1705862400000/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online",
    "summary": { "uptime": "45 days", ... }
  }'
```

### GET `/api/stats`
Obtener estadísticas
```bash
curl http://localhost:4000/api/stats
```
**Response:**
```json
{
  "total": 5,
  "online": 3,
  "offline": 2
}
```

---

## 🚀 Cómo Funciona

### 1. Iniciar la App
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

### 2. Primer Acceso
- App detecta BD vacía
- Muestra "Cargando..." (loading state)
- BD se inicializa con tablas
- UI lista para agregar firewalls

### 3. Agregar Firewall
```
Click "+ Agregar Firewall"
  ↓
Llenar formulario
  ↓
Click "Probar Conexión" (WebSocket SSH)
  ↓
Click "Agregar Firewall"
  ↓
API POST → Encripta credenciales
  ↓
Guardado en BD
  ↓
UI se actualiza (sin reload)
```

### 4. Refresh de Página
```
Page reload
  ↓
useEffect() ejecuta loadFirewalls()
  ↓
API GET /api/firewalls
  ↓
Desencripta todas las credenciales
  ↓
UI carga con todos tus firewalls
```

### 5. Editar Firewall
```
Hover + Click [Edit]
  ↓
Modal abre con datos pre-llenados (desencriptados)
  ↓
Modifica + Prueba conexión
  ↓
API PUT → Encripta nuevas credenciales
  ↓
BD actualizada
  ↓
UI refleja cambios
```

### 6. Eliminar Firewall
```
Click [Delete]
  ↓
Confirmación
  ↓
API DELETE
  ↓
BD actualizada
  ↓
UI refresca
```

---

## 📁 Estructura de Archivos

```
backend/
├── ws-server.js          ← Servidor + API endpoints
├── db.js                 ← Lógica de BD (encriptación)
├── data/
│   └── firewalls.db      ← BD SQLite (creada automáticamente)
└── package.json
```

---

## 🔐 Seguridad en Producción

### Cambiar Clave de Encriptación

En `backend/db.js` (línea 11):
```javascript
// ANTES (desarrollo):
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'pfsense-admin-default-key-change-in-production';

// DESPUÉS (producción):
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('ERROR: Fija ENCRYPTION_KEY en variables de entorno');
  process.exit(1);
}
```

### Usar Variable de Entorno

Crear `.env` en la carpeta backend:
```
ENCRYPTION_KEY=tu-clave-super-segura-de-32-caracteres-minimo
```

Cargar en `ws-server.js`:
```javascript
require('dotenv').config();
```

Instalar dotenv:
```bash
cd backend && npm install dotenv
```

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'better-sqlite3'"
```bash
cd backend && npm install better-sqlite3
```

### BD corrupta o queriendo limpiar
```bash
rm -rf backend/data/firewalls.db
# La BD se recrea automáticamente al iniciar
```

### Credenciales no se guardan
1. Verifica que el backend está corriendo (`npm run dev` en backend)
2. Verifica que el firewall se agrega exitosamente (status 201)
3. Revisa la consola del navegador para errores de fetch

### Firewalls desaparecen al reload
Probablemente la BD no se está inicializando. Verifica:
1. La carpeta `backend/data/` existe
2. El archivo `firewalls.db` se crea
3. No hay errores en consola del backend

---

## 📊 Características Implementadas

✅ **Persistencia**
- Firewalls se guardan automáticamente
- Credenciales encriptadas
- Métricas almacenadas

✅ **Carga Automática**
- Al iniciar la app, se cargan todos los firewalls
- No hay que hacer nada, es automático
- State React se sincroniza con BD

✅ **CRUD Completo**
- Create: `POST /api/firewalls`
- Read: `GET /api/firewalls`
- Update: `PUT /api/firewalls/:id`
- Delete: `DELETE /api/firewalls/:id`

✅ **Encriptación Segura**
- AES-256-CBC
- IV aleatorio
- No se almacenan credenciales en plaintext

✅ **API REST**
- Todo expuesto como API
- Fácil de expandir
- CORS habilitado

---

## 🎯 Ventajas de Esta Solución

1. **Segura**: Encriptación AES-256
2. **Rápida**: SQLite es muy rápida
3. **Local**: No requiere servidor externo
4. **Expandible**: Fácil agregar más tablas/funcionalidad
5. **Robusta**: BD transaccional
6. **Offline**: Funciona sin internet (solo para SSH se necesita)
7. **Portable**: Un archivo `firewalls.db` = todo guardado

---

## 🚀 Próximas Mejoras

- [ ] Backup automático de BD
- [ ] Exportar/Importar firewalls
- [ ] Cambiar contraseña de encriptación
- [ ] Logs de auditoría (quién cambió qué)
- [ ] Versionado de credenciales
- [ ] Sincronización con servidor remoto (opcional)

---

**Status**: ✅ **LISTO PARA USAR**

Los firewalls ahora se guardan automáticamente en una BD segura. No necesitas volver a agregarlos cada vez.
