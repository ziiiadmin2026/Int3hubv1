# ¡Sistema Listo! Persistencia Implementada

## ✅ Lo Que Acabamos de Hacer

Implementamos **SQLite + Encriptación AES-256** en el backend para que:

1. ✅ Los firewalls se guarden **automáticamente**
2. ✅ Las credenciales SSH se **encripten** (seguras)
3. ✅ Todo persista en una **BD local** (`backend/data/firewalls.db`)
4. ✅ No haya que agregar firewalls cada vez que recargas la página

---

## 🚀 Cómo Iniciar Ahora

### Opción A: Script Automático (Windows)
```bash
# Solo ejecuta el archivo START.bat (doble click)
START.bat
```
Esto abre automáticamente:
- Terminal 1: Backend (puerto 4000)
- Terminal 2: Frontend (puerto 3000)
- Navegador: http://localhost:3000

### Opción B: Manual (Windows/Mac/Linux)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Navegador:**
```
http://localhost:3000
```

---

## 📊 Arquitectura Nueva

```
Frontend (React)
    ↓
API REST (Express @ :4000)
    ↓
SQLite + Encriptación
    ↓
Archivo: backend/data/firewalls.db
```

### Flujo de Datos

**Primera vez que agregas un firewall:**
```
Modal → "Agregar Firewall" → API POST
  ↓
Backend encripta credenciales (AES-256)
  ↓
Guarda en SQLite
  ↓
Retorna datos sin credenciales
  ↓
UI actualiza
```

**Si recargas la página:**
```
App inicia → loadFirewalls()
  ↓
API GET /api/firewalls
  ↓
Backend desencripta credenciales
  ↓
React carga el estado
  ↓
Todos tus firewalls aparecen (sin agregar nada)
```

---

## 🔐 Seguridad

### Credenciales en la BD (Ejemplo)

```
Lo que escribes:
  Contraseña: "mipassword123"

Lo que se guarda en BD:
  password: "a1b2c3d4e5f6:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a"
                         ↑
                    IV + Encrypted (AES-256-CBC)

Lo que se usa para SSH:
  "mipassword123" (desencriptado automáticamente)
```

### Clave de Encriptación

Está en `backend/db.js` línea 11:
```javascript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'pfsense-admin-default-key-change-in-production';
```

**Para cambiarla en producción:**
```bash
# Crear archivo .env en la carpeta backend
ENCRYPTION_KEY=tu-clave-super-segura-de-32-caracteres
```

---

## 📝 Funcionalidades Nuevas

### 1. Agregar Firewall (Mismo que antes)
```
+ Agregar Firewall
  ↓
Llenar formulario
  ↓
Probar Conexión
  ↓
Se guarda PERMANENTEMENTE en BD
```

### 2. Reload de Página
```
Page refresh (F5)
  ↓
Todos los firewalls aparecen automáticamente
  ↓
No hay que hacer nada
```

### 3. Edit Firewall
```
Click [Edit]
  ↓
Modal con datos pre-llenados
  ↓
Modificas credenciales
  ↓
Se guardan encriptadas en BD
```

### 4. Delete Firewall
```
Click [Delete]
  ↓
Confirmación
  ↓
Se borra de BD
```

### 5. Disconnect
```
Click [Disconnect]
  ↓
Marca como offline
  ↓
Se guarda estado en BD
```

---

## 🗄️ Base de Datos

### Ubicación
```
f:\deV\NewDevFree\backend\data\firewalls.db
```

### Contenido

**Tabla `firewalls`:**
| Campo | Encriptado | Ejemplo |
|-------|------------|---------|
| id | No | "1705862400000" |
| name | No | "Router-Main" |
| ip | No | "10.0.0.1" |
| port | No | 22 |
| user | No | "admin" |
| password | **SÍ** | "a1b2c3:..." |
| key | **SÍ** | "a1b2c3:..." |
| status | No | "online" |
| summary | No | {"uptime":"45 days",...} |
| lastSeen | No | 1705862450000 |

---

## 🔌 API Endpoints Nuevos

### GET /api/firewalls
Obtener todos los firewalls (desencriptados)
```bash
curl http://localhost:4000/api/firewalls
```

### POST /api/firewalls
Agregar nuevo (credenciales se encriptan automáticamente)
```bash
curl -X POST http://localhost:4000/api/firewalls \
  -H "Content-Type: application/json" \
  -d '{"id":"123","name":"Router","host":"10.0.0.1","user":"admin","password":"pass"}'
```

### PUT /api/firewalls/:id
Actualizar firewall
```bash
curl -X PUT http://localhost:4000/api/firewalls/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Router-Updated"}'
```

### DELETE /api/firewalls/:id
Eliminar
```bash
curl -X DELETE http://localhost:4000/api/firewalls/123
```

### PATCH /api/firewalls/:id/status
Actualizar estado/métricas
```bash
curl -X PATCH http://localhost:4000/api/firewalls/123/status \
  -H "Content-Type: application/json" \
  -d '{"status":"online","summary":{...}}'
```

### GET /api/stats
Obtener estadísticas
```bash
curl http://localhost:4000/api/stats
# {"total": 5, "online": 3, "offline": 2}
```

---

## 🆘 Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
cd backend && npm install better-sqlite3 --save
npm run dev
```

### Firewalls no aparecen después de agregar
1. Verifica que el backend está corriendo (debería ver "Backend SSH WebSocket API running on port 4000")
2. Verifica en navegador (F12 → Console) si hay errores
3. Verifica que `backend/data/` existe

### Quiero limpiar la BD
```bash
# Cierra el backend primero
# Luego borra el archivo:
rm backend/data/firewalls.db

# Reinicia el backend - se recrea automáticamente
npm run dev
```

### Cambiar clave de encriptación
```bash
# 1. Crea .env en la carpeta backend
echo ENCRYPTION_KEY=mi-clave-segura-aqui > backend/.env

# 2. El backend ahora usará esa clave
# 3. Las credenciales nuevas se encriptarán con esa clave
# NOTA: Las credenciales viejas no se pueden descifrar con otra clave
```

---

## 📂 Archivos Nuevos/Modificados

### Creados:
- ✅ `backend/db.js` - Lógica de BD y encriptación
- ✅ `backend/data/` - Carpeta de datos (se crea automáticamente)
- ✅ `backend/data/firewalls.db` - BD SQLite (se crea automáticamente)
- ✅ `START.bat` - Script de inicio rápido

### Modificados:
- ✅ `backend/ws-server.js` - Agregó endpoints REST
- ✅ `backend/package.json` - Agregó `better-sqlite3`
- ✅ `pages/index.js` - Usa API en lugar de state local

---

## 🎯 Workflow Típico Ahora

### Día 1:
```
1. Ejecuta START.bat
2. Agrega 3 firewalls
3. Se guardan en BD
4. Cierra todo
```

### Día 2:
```
1. Ejecuta START.bat
2. ¡Todos tus 3 firewalls aparecen automáticamente!
3. Edita el nombre de uno
4. Se actualiza en BD
5. Refresh de página → sigue ahí con el nuevo nombre
```

### Día 3:
```
1. Ejecuta START.bat
2. Todos los firewalls siguen ahí
3. Agregas 2 más
4. Eliminas 1
5. Todo sincronizado con BD
```

---

## ✨ Características

✅ **Automático**: Los cambios se guardan sin hacer nada  
✅ **Seguro**: Credenciales encriptadas AES-256  
✅ **Rápido**: SQLite es muy eficiente  
✅ **Offline**: Funciona sin internet (BD local)  
✅ **Expandible**: Fácil agregar más tablas  
✅ **Portable**: Todo en un archivo `.db`  

---

## 🚀 Próximas Mejoras

- [ ] Backup automático de BD
- [ ] Exportar/Importar firewalls (JSON)
- [ ] Cambiar contraseña de encriptación
- [ ] Historial de cambios
- [ ] Sincronización en la nube (opcional)

---

## 📚 Documentación Completa

Para detalles técnicos, ver:
- **[PERSISTENCE.md](PERSISTENCE.md)** - Arquitectura y API

---

## ✅ Estatus

**Status**: ✅ **LISTO PARA USAR**

Simplemente ejecuta `START.bat` o los comandos manuales y comienza a usar el sistema. Los firewalls se guardarán automáticamente de forma segura.

**¡Disfruta!** 🎉
