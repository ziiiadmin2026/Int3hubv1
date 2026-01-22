# 🔒 Configuración de Seguridad y Ambiente

## Variables de Entorno (.env)

El proyecto usa un archivo `.env` para almacenar configuración sensible. **Este archivo NUNCA debe ser commiteado al repositorio**.

### Setup Local

1. **Copiar el archivo de ejemplo:**
```bash
cp backend/.env.example backend/.env
```

2. **Editar `backend/.env` con tus valores:**
```env
# Clave fuerte para encriptar credenciales
ENCRYPTION_KEY=tu-clave-super-secreta-aqui

# Puerto del backend
PORT=4000

# Ruta de la base de datos
DATABASE_PATH=./data/firewalls.db
```

### Encriptación de Credenciales

- Todas las credenciales SSH se almacenan **encriptadas** en la BD
- La clave de encriptación se lee desde `ENCRYPTION_KEY` en `.env`
- Cada credencial usa un IV (initialization vector) único
- Algoritmo: AES-256-CBC

### Deployment a Producción

**IMPORTANTE:** En producción, las variables de entorno deben configurarse de manera segura:

#### Opción 1: Variables de Entorno del Sistema
```bash
# En el servidor:
export ENCRYPTION_KEY="clave-production-super-fuerte"
export PORT=4000
npm run dev
```

#### Opción 2: Secrets Manager (Recomendado)
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Railway/Vercel Secrets

#### Opción 3: Docker Secrets
```dockerfile
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV PORT=${PORT}
```

### Checklist de Seguridad

✅ `.env` está en `.gitignore` - NO se commitea
✅ `.env.example` es público - muestra estructura sin valores sensibles
✅ `ENCRYPTION_KEY` es fuerte (min 32 caracteres en producción)
✅ Base de datos (`data/`) está en `.gitignore`
✅ Credenciales de firewalls se guardan encriptadas

### Credenciales de Firewalls

- **Guardadas:** En BD con encriptación AES-256
- **Acceso:** Solo se desencriptan al conectar por SSH
- **API:** Nunca retorna password/key desencriptados al frontend
- **Frontend:** No almacena credenciales, solo se guardan en backend

### Cambiar ENCRYPTION_KEY Existente

⚠️ Si cambias `ENCRYPTION_KEY`, todas las credenciales guardadas quedarán ilegibles.

**Procedimiento:**
1. Exportar todos los firewalls (hacer backup)
2. Eliminar la BD: `rm backend/data/firewalls.db`
3. Actualizar `ENCRYPTION_KEY` en `.env`
4. Reimportar firewalls

---

**Nunca hardcodees secretos en el código. Siempre usa `.env` o Secrets Manager.**
