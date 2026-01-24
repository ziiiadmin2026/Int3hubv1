const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Obtener ruta de la base de datos
const dbPath = process.env.DATABASE_PATH ? 
  path.resolve(process.env.DATABASE_PATH) : 
  path.join(__dirname, 'data', 'firewalls.db');

// Crear carpeta de datos si no existe
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  console.log(`[DB] Creando directorio: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`[DB] Using database at: ${dbPath}`);
  
const db = new Database(dbPath);

// Clave de encriptación (desde .env o default)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-me-in-production';

// Hash SHA256 de la clave para usar como IV
const keyHash = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

// Encriptar datos
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Desencriptar datos
function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error desencriptando:', err);
    return null;
  }
}

// Inicializar base de datos
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS firewalls (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      user TEXT NOT NULL,
      password TEXT NOT NULL,
      key TEXT,
      status TEXT DEFAULT 'offline',
      summary TEXT,
      lastSeen INTEGER,
      alert_emails TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Migraciones ligeras (por si la DB ya existía sin columnas nuevas)
  try {
    const cols = db.prepare('PRAGMA table_info(firewalls)').all().map(r => r.name);
    if (!cols.includes('alert_emails')) {
      db.exec('ALTER TABLE firewalls ADD COLUMN alert_emails TEXT');
    }
  } catch (e) {
    // Si falla por cualquier razón, no rompemos el arranque.
    console.error('[DB] Migration error:', e.message);
  }
}

// Obtener todos los firewalls (SIN credenciales por seguridad)
function getAllFirewalls() {
  const stmt = db.prepare('SELECT * FROM firewalls ORDER BY createdAt DESC');
  const firewalls = stmt.all();
  
  return firewalls.map(fw => ({
    id: fw.id,
    name: fw.name,
    ip: fw.ip,
    port: fw.port,
    user: fw.user,
    status: fw.status,
    alert_emails: fw.alert_emails ? JSON.parse(fw.alert_emails) : [],
    summary: fw.summary ? JSON.parse(fw.summary) : null,
    lastSeen: fw.lastSeen,
    createdAt: fw.createdAt,
    updatedAt: fw.updatedAt
  }));
}

// Obtener firewall por ID (SIN credenciales)
function getFirewall(id) {
  const stmt = db.prepare('SELECT * FROM firewalls WHERE id = ?');
  const fw = stmt.get(id);
  
  if (!fw) return null;
  
  return {
    id: fw.id,
    name: fw.name,
    ip: fw.ip,
    port: fw.port,
    user: fw.user,
    status: fw.status,
    alert_emails: fw.alert_emails ? JSON.parse(fw.alert_emails) : [],
    summary: fw.summary ? JSON.parse(fw.summary) : null,
    lastSeen: fw.lastSeen,
    createdAt: fw.createdAt,
    updatedAt: fw.updatedAt
  };
}

// Obtener firewall por ID CON credenciales (interno, para SSH)
function _getFirewallWithCredentials(id) {
  const stmt = db.prepare('SELECT * FROM firewalls WHERE id = ?');
  const fw = stmt.get(id);
  
  if (!fw) return null;
  
  return {
    ...fw,
    password: fw.password ? decrypt(fw.password) : '',
    key: fw.key ? decrypt(fw.key) : '',
    summary: fw.summary ? JSON.parse(fw.summary) : null
  };
}

// Agregar firewall
function addFirewall(id, data) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO firewalls (id, name, ip, port, user, password, key, status, summary, lastSeen, alert_emails, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const encryptedPassword = data.password ? encrypt(data.password) : encrypt('');
  const encryptedKey = data.key ? encrypt(data.key) : null;
  const summary = data.summary ? JSON.stringify(data.summary) : null;
  const alertEmails = data.alert_emails && data.alert_emails.length > 0 ? JSON.stringify(data.alert_emails) : null;
  
  stmt.run(
    id,
    data.name,
    data.host || data.ip,  // Aceptar host o ip
    data.port || 22,
    data.user,
    encryptedPassword,
    encryptedKey,
    data.status || 'offline',
    summary,
    data.lastSeen || null,
    alertEmails,
    now,
    now
  );
  
  return getFirewall(id);
}

// Actualizar firewall
function updateFirewall(id, data) {
  const fw = getFirewall(id);
  if (!fw) return null;

  // Necesitamos conservar credenciales encriptadas si no vienen en el payload.
  // getFirewall() no expone password/key por seguridad.
  const existingRow = db.prepare('SELECT password, key, summary, alert_emails FROM firewalls WHERE id = ?').get(id);
  
  const now = Date.now();
  const encryptedPassword = (data.password !== undefined)
    ? encrypt(String(data.password))
    : existingRow.password;
  const encryptedKey = (data.key !== undefined)
    ? (data.key ? encrypt(String(data.key)) : null)
    : existingRow.key;
  const summary = (data.summary !== undefined)
    ? (data.summary ? JSON.stringify(data.summary) : null)
    : existingRow.summary;
  const alertEmails = (data.alert_emails !== undefined)
    ? (data.alert_emails && data.alert_emails.length > 0 ? JSON.stringify(data.alert_emails) : null)
    : existingRow.alert_emails;
  
  const stmt = db.prepare(`
    UPDATE firewalls 
    SET name = ?, ip = ?, port = ?, user = ?, password = ?, key = ?, status = ?, summary = ?, lastSeen = ?, alert_emails = ?, updatedAt = ?
    WHERE id = ?
  `);
  
  stmt.run(
    data.name || fw.name,
    data.host || fw.ip,
    data.port || fw.port,
    data.user || fw.user,
    encryptedPassword,
    encryptedKey,
    data.status !== undefined ? data.status : fw.status,
    summary,
    data.lastSeen !== undefined ? data.lastSeen : fw.lastSeen,
    alertEmails,
    now,
    id
  );
  
  return getFirewall(id);
}

// Eliminar firewall
function deleteFirewall(id) {
  const stmt = db.prepare('DELETE FROM firewalls WHERE id = ?');
  stmt.run(id);
  return true;
}

// Actualizar estado y metrics
function updateStatus(id, status, summary, options = undefined) {
  const now = Date.now();
  const summaryJson = summary ? JSON.stringify(summary) : null;

  const touchLastSeen = options?.touchLastSeen !== undefined ? options.touchLastSeen : true;

  if (!touchLastSeen) {
    const stmt = db.prepare(`
      UPDATE firewalls 
      SET status = ?, summary = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt.run(status, summaryJson, now, id);
    return getFirewall(id);
  }
  
  const stmt = db.prepare(`
    UPDATE firewalls 
    SET status = ?, summary = ?, lastSeen = ?, updatedAt = ?
    WHERE id = ?
  `);
  
  stmt.run(status, summaryJson, now, now, id);
  return getFirewall(id);
}

// Obtener estadísticas
function getStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM firewalls').get();
  const online = db.prepare("SELECT COUNT(*) as count FROM firewalls WHERE status = 'online'").get();
  const offline = db.prepare("SELECT COUNT(*) as count FROM firewalls WHERE status = 'offline'").get();
  
  return {
    total: total.count,
    online: online.count,
    offline: offline.count
  };
}

// Cerrar BD
function closeDatabase() {
  db.close();
}

// Helper: Desencriptar firewall
function _decryptFirewall(fw) {
  let password = fw.password;
  let key = fw.key;
  
  try {
    if (fw.password) password = decrypt(fw.password);
  } catch (e) {
    // Si falla, usar como está
  }
  
  try {
    if (fw.key) key = decrypt(fw.key);
  } catch (e) {
    // Si falla, usar como está
  }
  
  return {
    ...fw,
    password: password || null,
    key: key || null
  };
}

// Auth functions
function getUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

function getUserById(id) {
  const stmt = db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?');
  return stmt.get(id);
}

function createUser(id, username, passwordHash, email = null, role = 'user') {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (id, username, passwordHash, email, role, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, username, passwordHash, email, role, now, now);
  return getUserById(id);
}

function getAllUsers() {
  const stmt = db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC');
  return stmt.all();
}

function updateUser(id, updates) {
  const { username, email, role } = updates;
  const now = Date.now();
  
  const fields = [];
  const values = [];
  
  if (username !== undefined) {
    fields.push('username = ?');
    values.push(username);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    values.push(email);
  }
  if (role !== undefined) {
    fields.push('role = ?');
    values.push(role);
  }
  
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getUserById(id);
}

function updateUserPassword(id, newPasswordHash) {
  const now = Date.now();
  const stmt = db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?');
  stmt.run(newPasswordHash, now, id);
  return getUserById(id);
}

function deleteUser(id) {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Actualizar estado y métricas de un firewall (para scheduler)
function updateFirewallStatus(id, status, metrics = {}) {
  const now = Date.now();
  const summary = metrics ? JSON.stringify(metrics) : null;
  
  const stmt = db.prepare(`
    UPDATE firewalls 
    SET status = ?, summary = ?, lastSeen = ?, updatedAt = ?
    WHERE id = ?
  `);
  
  stmt.run(status, summary, now, now, id);
}

// Obtener firewalls con credenciales (para scheduler)
function getFirewalls() {
  const stmt = db.prepare('SELECT * FROM firewalls');
  const firewalls = stmt.all();
  
  return firewalls.map(fw => {
    let password = null;
    let key = null;
    
    try {
      if (fw.password) password = decrypt(fw.password);
      if (fw.key) key = decrypt(fw.key);
    } catch (error) {
      console.error(`[DB] Error decrypting firewall ${fw.id}:`, error.message);
    }
    
    return {
      id: fw.id,
      name: fw.name,
      ip: fw.ip,
      port: fw.port,
      user: fw.user,
      password,
      key,
      status: fw.status,
      summary: fw.summary ? JSON.parse(fw.summary) : null,
      lastSeen: fw.lastSeen
    };
  });
}

// Obtener configuración del sistema
function getSettings() {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all();
  
  const settings = {
    notifications_enabled: false,
    smtp_host: process.env.SMTP_HOST || '',
    smtp_port: parseInt(process.env.SMTP_PORT || '587'),
    smtp_secure: process.env.SMTP_SECURE === 'true',
    smtp_user: process.env.SMTP_USER || '',
    smtp_pass: process.env.SMTP_PASS || '',
    smtp_from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    alert_emails: process.env.ALERT_EMAIL ? process.env.ALERT_EMAIL.split(',').map(e => e.trim()) : [],
    monitor_interval: parseInt(process.env.MONITOR_INTERVAL || '300000')
  };
  
  // Sobrescribir con valores de la DB si existen
  rows.forEach(row => {
    try {
      const value = JSON.parse(row.value);
      settings[row.key] = value;
    } catch {
      settings[row.key] = row.value;
    }
  });
  
  return settings;
}

// Guardar configuración del sistema
function saveSettings(settings) {
  const keys = Object.keys(settings);
  
  keys.forEach(key => {
    const value = typeof settings[key] === 'object' 
      ? JSON.stringify(settings[key]) 
      : String(settings[key]);
    
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  });
}

// Inicializar al cargar el módulo
initDatabase();

module.exports = {
  db,
  encrypt,
  decrypt,
  _decryptFirewall,
  _getFirewallWithCredentials,
  getAllFirewalls,
  getFirewall,
  getFirewalls,
  addFirewall,
  updateFirewall,
  updateFirewallStatus,
  deleteFirewall,
  updateStatus,
  getStats,
  getSettings,
  saveSettings,
  closeDatabase,
  getUserByUsername,
  getUserById,
  createUser,
  getAllUsers,
  updateUser,
  updateUserPassword,
  deleteUser
};
