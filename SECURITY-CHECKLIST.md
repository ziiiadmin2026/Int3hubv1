# 🔒 Security Checklist para Producción

## ⚠️ CRÍTICO - ANTES DE DEPLOY

### 1. Variables de Entorno
- [ ] **JWT_SECRET**: Cambiar a clave aleatoria de 64+ caracteres
  ```bash
  # Generar con Node.js:
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] **ENCRYPTION_KEY**: Cambiar clave de encriptación de credenciales SSH
- [ ] **Agregar todas las variables en .env de producción**

### 2. HTTPS Obligatorio
- [ ] Configurar certificado SSL/TLS (Let's Encrypt)
- [ ] Forzar HTTPS en todas las rutas
- [ ] Actualizar cookies para usar `Secure` flag:
  ```javascript
  // En ws-server.js línea 47:
  const cookieValue = `token=${token}; HttpOnly; Secure; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`;
  ```

### 3. Contraseñas
- [ ] Eliminar o cambiar contraseña del usuario admin por defecto
- [ ] Implementar política de contraseñas fuertes:
  - Mínimo 12 caracteres
  - Mayúsculas, minúsculas, números, símbolos
- [ ] Agregar validación en backend antes de crear usuarios

### 4. Rate Limiting
- [ ] Implementar límite de intentos de login (express-rate-limit)
  ```javascript
  // Ejemplo:
  const rateLimit = require('express-rate-limit');
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    message: 'Demasiados intentos de login'
  });
  app.post('/api/auth/login', loginLimiter, ...);
  ```

### 5. Base de Datos
- [ ] Mover base de datos fuera de carpeta pública
- [ ] Implementar backups automáticos
- [ ] Permisos restrictivos en archivo .db (chmod 600)

### 6. Headers de Seguridad
- [ ] Instalar `helmet` para headers HTTP seguros
  ```javascript
  const helmet = require('helmet');
  app.use(helmet());
  ```

### 7. CORS
- [ ] Actualizar CORS para dominio específico (no usar '*')
  ```javascript
  app.use(cors({ 
    origin: 'https://tudominio.com',
    credentials: true 
  }));
  ```

### 8. Logs y Auditoría
- [ ] Implementar logging de acciones críticas:
  - Login exitoso/fallido
  - Creación/eliminación de usuarios
  - Acceso a firewalls
- [ ] No loggear contraseñas o tokens

### 9. Credenciales SSH
- [ ] Las credenciales SSH ya están encriptadas ✅
- [ ] Verificar ENCRYPTION_KEY única en producción

### 10. Validaciones Backend
- [ ] Sanitizar inputs (express-validator)
- [ ] Validar longitud de username/email
- [ ] Prevenir inyección SQL (ya usas prepared statements ✅)

## 📋 Variables de Entorno Requeridas

Crear archivo `.env` en producción con:

```env
# Seguridad (CAMBIAR TODOS)
JWT_SECRET=<generar-clave-aleatoria-64-caracteres>
ENCRYPTION_KEY=<generar-clave-aleatoria-32-caracteres>

# Servidor
PORT=4000
NODE_ENV=production

# Base de datos
DATABASE_PATH=/var/lib/int3hub/firewalls.db

# JWT
JWT_EXPIRES_IN=7d

# SSH
CONNECT_COOLDOWN_MS=15000
CONNECT_FAIL_BACKOFF_BASE_MS=15000
CONNECT_FAIL_BACKOFF_MAX_MS=300000
```

## 🚀 Comandos para Producción

### Generar claves seguras:
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Instalar dependencias de seguridad:
```bash
cd backend
npm install helmet express-rate-limit express-validator
```

### Permisos de archivos:
```bash
chmod 600 backend/.env
chmod 600 backend/data/firewalls.db
chown www-data:www-data backend/data/firewalls.db
```

## 🔍 Testing de Seguridad

Antes de producción, probar:
- [ ] Login con credenciales incorrectas (rate limiting)
- [ ] Acceso sin token a `/api/users`
- [ ] Acceso con token expirado
- [ ] Usuario no-admin intentando acceder a `/api/users`
- [ ] HTTPS forzado (no caer a HTTP)
- [ ] CORS desde dominio no autorizado

## 📝 Monitoreo Post-Deploy

- [ ] Alertas de múltiples login fallidos
- [ ] Monitoreo de uso de CPU/RAM
- [ ] Logs centralizados
- [ ] Actualización de dependencias npm

## ⚠️ NO HACER EN PRODUCCIÓN

- ❌ Usar `JWT_SECRET` por defecto
- ❌ Usar `ENCRYPTION_KEY` por defecto
- ❌ Cookies sin `Secure` flag
- ❌ CORS con origin='*'
- ❌ Loggear passwords o tokens
- ❌ Exponer stack traces a usuarios
- ❌ Base de datos sin backups
