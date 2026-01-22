# Quick Start Guide - pfSense Multi-Firewall Admin UI

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- pfSense systems accessible via SSH

### Installation

1. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

---

## 🔧 Running the Application

### Terminal 1: Start Backend WebSocket Server
```bash
cd backend
npm run dev
# Backend runs on: ws://localhost:4000
```

### Terminal 2: Start Frontend Development Server
```bash
npm run dev
# Frontend runs on: http://localhost:3000
```

Open http://localhost:3000 in your browser.

---

## 📋 How to Use

### 1. **Add a Firewall**
   - Click the **"+ Agregar Firewall"** button in the Sidebar
   - Fill in the firewall details:
     - **Nombre**: Display name (e.g., "Router-Main")
     - **IP o Dominio**: pfSense hostname/IP
     - **Usuario SSH**: SSH username (usually `root`)
     - **Puerto**: SSH port (default: 22)
     - **Contraseña SSH**: SSH password
     - **Clave Privada**: Optional key-based auth
   - Click **"Probar Conexión"** to verify SSH access
   - Once connected, click **"Agregar Firewall"** to save

### 2. **View Firewall Status**
   - Firewalls appear in the grid in the Dashboard
   - Green dot (●) = Online (verified via SSH)
   - Red dot (●) = Offline (not connected)
   - Click any firewall card to view detailed metrics

### 3. **View Detailed Metrics**
   - Select a firewall to see:
     - **Uptime**: System uptime
     - **System**: FreeBSD kernel info
     - **CPU Cores**: Number of cores
     - **Memory**: RAM (human-readable)
     - **Disk**: Total, used, available, percentage
     - **Gateway**: Default gateway IP
     - **Network Interfaces**: All interfaces with IPs

### 4. **Edit a Firewall**
   - Hover over a firewall in the Sidebar → Click **Edit** (blue icon)
   - OR: Click a firewall to select it → Click **Edit** in the Details Panel
   - Modal opens with pre-filled data
   - Make changes and test connection
   - Click **Agregar Firewall** to save changes

### 5. **Disconnect a Firewall**
   - Hover over a firewall → Click **Disconnect** (yellow icon)
   - OR: Click a firewall → Click **Disconnect** in the Details Panel
   - Firewall marked as offline; SSH session closed

### 6. **Delete a Firewall**
   - Hover over a firewall → Click **Delete** (red icon)
   - OR: Click a firewall → Click **Delete** in the Details Panel
   - Confirmation dialog appears
   - Click OK to remove permanently

---

## 🎨 UI Components

### Sidebar
- Firewall list with status indicators
- Hover to reveal action buttons (Edit/Disconnect/Delete)
- Add Firewall button at bottom
- Modal for connection management

### Dashboard
- Grid view of all firewalls
- Click to select and view details
- Selected firewall highlighted with emerald border
- Details panel shows full metrics and actions

### Action Buttons
| Button | Color | Action |
|--------|-------|--------|
| Edit | Blue | Open edit modal with pre-filled data |
| Disconnect | Yellow | Mark offline, close SSH session |
| Delete | Red | Remove with confirmation |

---

## 🔌 Backend Architecture

### WebSocket Events

**From Frontend to Backend:**
- `ssh-connect`: { host, port, user, password/key }

**From Backend to Frontend:**
- `ssh-log`: { message, type } (real-time output)
- `ssh-summary`: { uptime, cpu, memory, disk, interfaces, gateway, ... }
- `ssh-end`: { success: true/false }

### SSH Commands Executed
1. `uname -a` → System info
2. `uptime` → System uptime
3. `sysctl hw.ncpu` → CPU count
4. `sysctl hw.physmem` → Total memory
5. `ifconfig` → Network interfaces
6. `netstat -rn` → Gateway detection
7. `df -h` → Disk usage
8. `echo __END__` → Parser marker

---

## 🔒 Security Notes

⚠️ **Current State**: Development mode (no TLS/auth)

### For Production:
- [ ] Enable HTTPS (self-signed or valid cert)
- [ ] Add user authentication layer
- [ ] Encrypt stored credentials
- [ ] Use environment variables for secrets
- [ ] Validate/sanitize all SSH input
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Use SSH key pairs instead of passwords

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm run dev
```

### Frontend can't connect to backend
- Check backend is running on port 4000
- Check firewall rules don't block localhost:4000
- Verify CORS settings in backend

### SSH connection fails
- Verify SSH credentials are correct
- Check pfSense system is reachable
- Verify SSH port (usually 22, sometimes different)
- Check firewall rules on pfSense side

### Metrics not showing
- Connection must be established (green dot)
- Check backend logs for parser errors
- Try disconnecting and reconnecting

---

## 📦 Project Structure

```
f:\deV\NewDevFree\
├── pages/
│   └── index.js                    # Main page (state management)
├── components/
│   ├── Sidebar.js                  # Firewall list + actions
│   ├── Dashboard.js                # Metrics display + details
│   ├── Topbar.js                   # Header
│   ├── AddFirewallModal.js         # Connection form
│   └── ...
├── styles/
│   └── globals.css
├── backend/
│   ├── ws-server.js                # WebSocket SSH proxy
│   ├── index.js                    # (legacy HTTP server)
│   ├── package.json
│   └── node_modules/
├── package.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 🎯 Features

✅ **Implemented:**
- Multi-firewall SSH management
- Real-time log streaming (PuTTY-like)
- Automatic metric extraction
- Status verification (online/offline)
- Full CRUD operations (Add/Edit/Delete)
- Disconnect/reconnect support
- Dark theme UI (Integrational branded)

🔄 **Planned:**
- Real-time graphs (CPU, memory, bandwidth)
- VPN user management
- Firewall rule statistics
- SSH key management
- Persistent storage (SQLite/PostgreSQL)
- User authentication
- TLS encryption
- Rate limiting & audit logs

---

## 📝 Notes

- Each firewall connection is stateless; metrics fetched on-demand
- SSH sessions close after metrics are gathered
- All timestamps stored in UTC
- UI auto-refreshes when firewalls added/removed
- Edit mode pre-fills existing firewall data

---

For more details, see `FIREWALL_ENHANCEMENTS.md`
