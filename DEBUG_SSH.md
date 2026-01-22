# 🔧 Guía de Debugging - SSH y Obtención de Datos

## Problema Identificado

El firewall conecta (status: online) pero **NO obtiene datos reales del sistema** (todos N/A).

**Causa probable**: El comando SSH se está ejecutando pero pfSense está mostrando un menú interactivo en lugar de ejecutar los comandos.

## Herramienta de Diagnostic

### 1. Acceder a Diagnostic

```
http://localhost:3000/diagnostic
```

### 2. Obtener ID del Firewall

#### Opción A: Desde la Console del Navegador
```javascript
// Abrir DevTools (F12) → Console
// Ejecutar:
console.log(localStorage)
```

#### Opción B: Desde la BD
```bash
cd backend
sqlite3 data/firewalls.db
SELECT id FROM firewalls;
```

### 3. Ejecutar Diagnostic

1. Copiar el ID
2. Pegarlo en la página `/diagnostic`
3. Click "Ejecutar"

### 4. Interpretar Resultados

#### ✅ Si ves datos reales:
```
Uptime: 2 days, 14:33:21
CPU Cores: 4
Memory: 8.0 GB
IPs: 189.192.233.118
Interfaces: 4
```
→ **SSH funciona correctamente**, problema está en el parseo

#### ❌ Si ves menú de pfSense:
```
 0) Logout (SSH only)                  9) pfTop
 1) Assign Interfaces                 10) Filter Logs
 2) Set interface(s) IP address       11) Restart webConfigurator
 ...
```
→ **Comandos no se ejecutan**, menú interactivo está activo

#### ❌ Si ves "All configured authentication methods failed":
→ **Credenciales SSH incorrectas**

## Soluciones por Tipo de Error

### Opción 1: pfSense Mostrando Menú

**Problema**: Los comandos no se ejecutan porque pfSense entra en modo interactivo.

**Soluciones**:

#### A. Usar usuario sin shell interactivo
```bash
# En pfSense, crear usuario con shell específico
# ssh admin@192.168.1.1
# System → User Manager → Create user
# Shell: /usr/sbin/nologin o /bin/sh
```

#### B. Ejecutar comandos con opción -t
Cambiar comando en `ssh-utils.js`:
```javascript
// ACTUAL
const shellCommand = `sh -c "${command}"`;

// INTENTA CON
const shellCommand = `exec "${command}" </dev/null 2>&1`;
```

#### C. Usar comando único sin pipes
```javascript
// En fetchPfSenseStats(), cambiar a:
const commands = 'uname -a';
// Y separar en múltiples requests
```

### Opción 2: Credenciales Incorrectas

**Verificar**:
```bash
# Probar manualmente
ssh -p 10022 admin@189.192.233.118
# Ingresar contraseña

# Si funciona en terminal pero no en app:
# - Verificar espacios en blanco en credenciales
# - Verificar caracteres especiales
# - Probar con contraseña simple sin especiales
```

### Opción 3: Puerto SSH Incorrecto

**Verificar**:
```bash
# Verificar puerto abierto
telnet 189.192.233.118 10022

# Si responde → puerto correcto
# Si no responde → probar puerto 22
```

## Debug Avanzado

### 1. Ver logs detallados del backend

```bash
# Terminal 1: Backend con logs
cd backend
npm run dev

# Terminal 2: Ejecutar diagnostic
# Observar logs en Terminal 1
```

Buscar líneas como:
```
[SSH] Iniciando conexión a 189.192.233.118:10022...
[SSH] Conexión lista
[SSH] Ejecutando: sh -c "uname -a && uptime && ..."
[SSH] Datos recibidos (2345 bytes)
[PARSE] Procesando 123 líneas...
[PARSE] Uptime encontrado: 2 days...
```

### 2. Capturar raw output

La página `/diagnostic` muestra el output exacto que retorna SSH.

**Si ves menú**:
```
Raw SSH Output:
 0) Logout (SSH only)
 1) Assign Interfaces
 ...
```

**Si ves comandos**:
```
Raw SSH Output:
FreeBSD fw.localdomain 12.4-RELEASE FreeBSD 12.4-RELEASE #0...
19:45:32 up 2 days, 14:33, 1 user, load average: 0.12, 0.08, 0.06
hw.ncpu: 4
hw.physmem: 8589934592
...
```

### 3. Probar con código personalizado

En `ssh-utils.js`, temporalmente cambiar `fetchPfSenseStats`:

```javascript
// Usar solo UNO de estos comandos para probar:

// Opción 1: Muy simple
const commands = 'whoami';

// Opción 2: Con info del sistema
const commands = 'uname -a';

// Opción 3: Uptime
const commands = 'uptime';

// Opción 4: Con subshell
const commands = 'sh -c "uname -a"';
```

Luego ejecutar diagnostic y ver qué retorna.

## Solución Final Recomendada

Si nada funciona, el problema es que **pfSense requiere un shell interactivo** para ciertos usuarios.

**Solución**:

1. **En pfSense** (SSH como admin):
```bash
# Editar login shell para admin
vipw
# Cambiar shell de admin a: /bin/sh

# O crear usuario dedicado:
# System → User Manager
# Username: monitoring
# Shell: /bin/sh
# Password: algo_seguro
```

2. **En app** (actualizar credenciales):
```
User: monitoring
Password: algo_seguro
```

3. **Ejecutar Diagnostic nuevamente**

Si sigue sin funcionar:

```bash
# Conectar manualmente y ejecutar comando
ssh -p 10022 monitoring@189.192.233.118 "uname -a"

# Si funciona en terminal pero no en app:
# - Problema en la librería ssh2
# - Contactar soporte con output de /diagnostic
```

## Datos Esperados

Si todo funciona correctamente, deberías ver:

```json
{
  "uptime": "19:45:32 up 2 days, 14:33, 1 user, load average: 0.12, 0.08, 0.06",
  "cpuCount": 4,
  "memory": "8.0 GB",
  "ips": ["189.192.233.118"],
  "interfaces": [
    {"iface": "em0", "ip": "189.192.233.118"},
    {"iface": "em1", "ip": "192.168.1.1"}
  ],
  "gateway": "189.192.233.1",
  "uname": "FreeBSD fw.localdomain 12.4-RELEASE..."
}
```

## Contacto/Soporte

Si necesitas ayuda:

1. Ejecutar `/diagnostic`
2. Copiar el raw output
3. Verificar que no contenga credenciales
4. Compartir en issue del repositorio

---

**Última actualización**: Enero 2026
