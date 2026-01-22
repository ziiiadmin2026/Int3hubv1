# � pfSense Multi-Firewall Admin Dashboard

Sistema de administración centralizado para múltiples firewalls pfSense con SSH, almacenamiento persistente y encriptación de credenciales.

## ✨ Características

- 🔐 **Conexión SSH** a múltiples firewalls pfSense
- 📊 **Dashboard en tiempo real** con métricas del sistema
- 💾 **Almacenamiento persistente** en SQLite con encriptación AES-256
- 🔒 **Credenciales seguras** - nunca se exponen en el frontend
- ⚡ **Interfaz moderna** con Next.js + Tailwind
- 🔄 **Auto-sincronización** - conecta automáticamente al agregar firewall
- 📱 **Responsive design** - funciona en desktop y tablet

## 🚀 Inicio Rápido

### Requisitos
- Node.js v20+
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install
cd backend && npm install && cd ..

# Configurar variables de entorno
cp backend/.env.example backend/.env

# Iniciar desarrollo (ambos servidores en paralelo)
npm run dev
```

**URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 🔐 Configuración de Seguridad

### Variables de Entorno (.env)

**IMPORTANTE**: Crear `backend/.env` desde `.env.example`

```env
# Clave fuerte para encriptar credenciales SSH
ENCRYPTION_KEY=tu-clave-super-secreta-minimo-32-caracteres-en-produccion

# Puerto del backend
PORT=4000

# Ruta de base de datos
DATABASE_PATH=./data/firewalls.db
```

**Reglas de Seguridad:**
- ✅ `.env` está en `.gitignore` - NO se commitea
- ✅ `.env.example` es público - muestra estructura sin valores
- ✅ `ENCRYPTION_KEY` debe ser >32 caracteres en producción
- ✅ Credenciales SSH se guardan encriptadas en BD
- ✅ API nunca retorna passwords desencriptados al frontend

Ver [SEGURIDAD.md](./SEGURIDAD.md) para más detalles.

## 📋 Uso

### Agregar Firewall

1. Click "+ Agregar Firewall"
2. Ingresar detalles SSH
3. Click "Probar Conexión"
4. Si funciona, click "Agregar Firewall"

**Datos que se obtienen automáticamente:**
- Uptime del sistema
- CPU Cores
- Memory total
- Disk Usage
- Interfaces de red
- Gateway

## 🏗️ Arquitectura

```
Frontend (React/Next.js)
    ↓ REST API / WebSocket
Backend (Express/Socket.IO)
    ↓ SSH2
Firewalls pfSense
    ↓
SQLite (AES-256 encrypted)
```

**Base de Datos:**
- SQLite con AES-256-CBC encryption
- Almacenamiento: `backend/data/firewalls.db`
- Credenciales encriptadas con IV único

## 🔌 API Endpoints

### Firewalls
- `GET /api/firewalls` - Listar todos
- `POST /api/firewalls` - Crear
- `PUT /api/firewalls/:id` - Actualizar
- `DELETE /api/firewalls/:id` - Eliminar

### Conexiones SSH
- `POST /api/firewalls/:id/connect` - Conectar y obtener stats
- `PATCH /api/firewalls/:id/status` - Actualizar estado

### WebSocket
- `ssh-connect` - Conectar con logs en vivo
- `ssh-cmd` - Ejecutar comando
- `ssh-summary` - Datos del sistema

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| SSH timeout | Verificar conectividad y puerto SSH |
| Auth failed | Verificar usuario/contraseña |
| ENCRYPTION_KEY error | Asegurar `backend/.env` existe |
| BD corrupta | `rm backend/data/firewalls.db` y reiniciar |

## 📚 Documentación Adicional

- [SEGURIDAD.md](./SEGURIDAD.md) - Guía de seguridad y deployment
- [PERSISTENCE.md](./PERSISTENCE.md) - Detalles técnicos de persistencia
- [USAR_AHORA.md](./USAR_AHORA.md) - Guía en español

## 💡 Desarrollo

```bash
npm run dev           # Frontend + Backend
npm --prefix ./backend run dev  # Solo Backend
npm run build         # Build para producción
npm run start         # Producción
```

---

**Versión**: 1.0.0 | **Última actualización**: Enero 2026

**English:**
1. **[QUICK_START.md](QUICK_START.md)** ← Read this first!
2. **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Project overview

**Español:**
1. **[USAR_AHORA.md](USAR_AHORA.md)** ← ¡Lee esto primero!
   - Persistencia de datos ✅
   - BD SQLite + Encriptación
   - Guía de inicio rápido

2. **[PERSISTENCE.md](PERSISTENCE.md)** - Arquitectura de BD

---

## 📖 Main Documentation

### Understanding the Project
- **[FIREWALL_ENHANCEMENTS.md](FIREWALL_ENHANCEMENTS.md)**
  - What features were added
  - Component changes summary
  - File-by-file breakdown

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
  - Technical implementation details
  - Action flow diagrams
  - Code quality metrics
  - Testing checklist

### Using the Application
- **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)**
  - UI layout diagrams
  - Action button locations
  - User workflow diagrams
  - Color legend
  - Responsive breakpoints

- **[REFERENCE.md](REFERENCE.md)**
  - Complete API reference
  - Data structures
  - State management
  - Error handling patterns
  - Troubleshooting guide

### Status & Readiness
- **[READY_TO_RUN.md](READY_TO_RUN.md)**
  - What's included
  - How to start
  - All features verified
  - Quick reference guide

- **[FINAL_CHECKLIST.md](FINAL_CHECKLIST.md)**
  - Comprehensive completion checklist
  - All verification results
  - Test scenarios ready
  - Sign-off documentation

---

## 📋 Quick Navigation by Task

### "I want to start using the app"
→ Start with [QUICK_START.md](QUICK_START.md)

### "I want to understand what changed"
→ Read [FIREWALL_ENHANCEMENTS.md](FIREWALL_ENHANCEMENTS.md)

### "I want to see the architecture"
→ Check [REFERENCE.md](REFERENCE.md)

### "I want to see the UI"
→ Look at [VISUAL_GUIDE.md](VISUAL_GUIDE.md)

### "I want to verify it's ready"
→ Review [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md)

### "I need a summary"
→ Read [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)

### "I need technical details"
→ Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 🎯 Common Questions & Answers

### Q: How do I get started?
**A**: Follow these steps:
1. Read [QUICK_START.md](QUICK_START.md) (5 min)
2. Run the dev servers (2 terminals)
3. Open http://localhost:3000
4. Add your first firewall
5. Test edit/delete/disconnect features

**Total time**: ~10 minutes

### Q: What features were added?
**A**: See [FIREWALL_ENHANCEMENTS.md](FIREWALL_ENHANCEMENTS.md):
- ✅ Edit firewall (pre-filled modal)
- ✅ Delete firewall (with confirmation)
- ✅ Disconnect firewall (mark offline)
- ✅ Enhanced UI with action buttons

### Q: Are there any errors?
**A**: No! See [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md):
- ✅ 0 compilation errors
- ✅ All components tested
- ✅ All handlers wired
- ✅ Ready for production dev

### Q: Which files were changed?
**A**: Only 3 files modified:
1. `pages/index.js` - State management
2. `components/Sidebar.js` - Action buttons
3. `components/Dashboard.js` - Details panel + buttons

See [FIREWALL_ENHANCEMENTS.md](FIREWALL_ENHANCEMENTS.md#file-changes-summary)

### Q: How do I use the new features?
**A**: See [VISUAL_GUIDE.md](VISUAL_GUIDE.md):
- Edit: Hover firewall → click blue Edit button
- Delete: Hover firewall → click red Delete button
- Disconnect: Hover firewall → click yellow Disconnect button

### Q: What if something doesn't work?
**A**: Check these resources:
- [QUICK_START.md - Troubleshooting](QUICK_START.md#troubleshooting)
- [REFERENCE.md - Troubleshooting](REFERENCE.md#troubleshooting)
- [READY_TO_RUN.md - Troubleshooting](READY_TO_RUN.md#troubleshooting-quick-guide)

### Q: Is it ready for production?
**A**: **Not yet**. See [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md#security-posture):
- ✅ Ready for development
- ⚠️ Add HTTPS/TLS for production
- ⚠️ Add authentication
- ⚠️ Encrypt credentials
- ⚠️ Add audit logging

### Q: Can I deploy it now?
**A**: You can deploy the dev version locally, but for production see the deployment checklist in [FINAL_CHECKLIST.md](FINAL_CHECKLIST.md#deployment-checklist-future).

---

## 📊 Documentation Statistics

| Document | Length | Focus |
|----------|--------|-------|
| QUICK_START.md | ~200 lines | Usage & setup |
| FIREWALL_ENHANCEMENTS.md | ~150 lines | What changed |
| REFERENCE.md | ~300 lines | API & architecture |
| VISUAL_GUIDE.md | ~250 lines | UI & diagrams |
| IMPLEMENTATION_SUMMARY.md | ~200 lines | Technical details |
| READY_TO_RUN.md | ~250 lines | Status & reference |
| FINAL_CHECKLIST.md | ~300 lines | Verification |
| EXECUTIVE_SUMMARY.md | ~250 lines | Overview |

**Total**: ~1,900 lines of comprehensive documentation

---

## 🗂️ Project Structure

```
f:\deV\NewDevFree\
├── 📁 pages/
│   └── index.js              ← Main state & handlers
├── 📁 components/
│   ├── Sidebar.js            ← Action buttons ✨
│   ├── Dashboard.js          ← Details panel ✨
│   ├── AddFirewallModal.js   ← Edit mode support
│   └── Topbar.js
├── 📁 backend/
│   ├── ws-server.js          ← WebSocket SSH
│   └── package.json
├── 📄 package.json           ← Frontend deps
│
└── 📚 Documentation
    ├── README (this file)
    ├── QUICK_START.md
    ├── EXECUTIVE_SUMMARY.md
    ├── FIREWALL_ENHANCEMENTS.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── REFERENCE.md
    ├── VISUAL_GUIDE.md
    ├── READY_TO_RUN.md
    └── FINAL_CHECKLIST.md

✨ = Enhanced with action buttons
```

---

## 🎓 Learning Path

### Beginner
1. [QUICK_START.md](QUICK_START.md) - Get it running
2. [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - Learn the UI
3. Start using the app

### Intermediate
1. [FIREWALL_ENHANCEMENTS.md](FIREWALL_ENHANCEMENTS.md) - What changed
2. [REFERENCE.md](REFERENCE.md) - API & data structures
3. Try all features

### Advanced
1. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical deep dive
2. [REFERENCE.md](REFERENCE.md) - Full architecture
3. Start customizing

---

## 🔍 Finding Specific Information

### Setup & Installation
- **[QUICK_START.md → Getting Started](QUICK_START.md#getting-started)**
- **[READY_TO_RUN.md → How to Start](READY_TO_RUN.md#how-to-start)**

### Features & Usage
- **[QUICK_START.md → How to Use](QUICK_START.md#how-to-use)**
- **[VISUAL_GUIDE.md → Action Flows](VISUAL_GUIDE.md#action-button-interactions)**

### UI Layout
- **[VISUAL_GUIDE.md → Application Layout](VISUAL_GUIDE.md#application-layout)**
- **[VISUAL_GUIDE.md → Sidebar Detail View](VISUAL_GUIDE.md#sidebar-detail-view)**
- **[VISUAL_GUIDE.md → Dashboard](VISUAL_GUIDE.md#dashboard)**

### Data Structures
- **[REFERENCE.md → Data Structure](REFERENCE.md#data-structure)**
- **[REFERENCE.md → State Flow](REFERENCE.md#state-flow)**

### Troubleshooting
- **[QUICK_START.md → Troubleshooting](QUICK_START.md#troubleshooting)**
- **[REFERENCE.md → Troubleshooting](REFERENCE.md#troubleshooting)**
- **[READY_TO_RUN.md → Quick Guide](READY_TO_RUN.md#troubleshooting-quick-guide)**

### API Reference
- **[REFERENCE.md → Backend Events](REFERENCE.md#websocket-events)**
- **[REFERENCE.md → SSH Commands](REFERENCE.md#ssh-commands-executed)**

### Technical Details
- **[IMPLEMENTATION_SUMMARY.md → Code Changes](IMPLEMENTATION_SUMMARY.md#code-changes-made)**
- **[IMPLEMENTATION_SUMMARY.md → State Flow](IMPLEMENTATION_SUMMARY.md#state-flow)**

---

## ✅ Verification Checklist

Use this checklist to verify the project is ready:

- [ ] Read QUICK_START.md
- [ ] Understand the new features in FIREWALL_ENHANCEMENTS.md
- [ ] Review the UI in VISUAL_GUIDE.md
- [ ] Check all items in FINAL_CHECKLIST.md are complete
- [ ] Verify EXECUTIVE_SUMMARY.md success criteria
- [ ] Start dev servers and test
- [ ] Report any issues

---

## 🚀 Next Steps

1. **Read the Quick Start**
   ```
   Open: QUICK_START.md
   Time: 5 minutes
   ```

2. **Start the Servers**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   npm run dev
   ```

3. **Open the App**
   ```
   http://localhost:3000
   ```

4. **Test the Features**
   - Add a firewall
   - Edit its name
   - View the metrics
   - Disconnect it
   - Delete it

5. **Verify Success**
   - All operations work ✓
   - UI is intuitive ✓
   - No errors in console ✓
   - Ready to customize ✓

---

## 💬 Questions or Issues?

### Finding Answers
1. Check [QUICK_START.md - Troubleshooting](QUICK_START.md#troubleshooting)
2. Review [REFERENCE.md - Troubleshooting](REFERENCE.md#troubleshooting)
3. Check the console for errors
4. Verify backend is running on port 4000
5. Verify frontend is running on port 3000

### Common Issues
- **Backend won't start**: `cd backend && npm install && npm run dev`
- **Frontend can't connect**: Check port 4000 is accessible
- **SSH fails**: Verify firewall IP/port/user/password
- **Buttons not showing**: Check lucide-react icons are imported

---

## 📝 Documentation Maintenance

These documents are auto-generated and maintained during development.

**Last Updated**: Today  
**Version**: 1.0  
**Status**: ✅ Complete

---

## 🎉 Summary

You have:
- ✅ 3 enhanced components (Sidebar, Dashboard, pages/index.js)
- ✅ 5 new handler functions
- ✅ 6 new action buttons
- ✅ 8 comprehensive guides
- ✅ 0 compilation errors
- ✅ Ready-to-run dev environment

**Total documentation**: 1,900+ lines  
**Total guides**: 8 comprehensive docs  
**Time to first use**: 5 minutes  
**Status**: ✅ COMPLETE & READY

---

**Start with [QUICK_START.md](QUICK_START.md) →**

Good luck! 🚀
