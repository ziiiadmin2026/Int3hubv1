const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Crear carpeta de datos si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH ? 
  path.resolve(process.env.DATABASE_PATH) : 
  path.join(dataDir, 'firewalls.db');
  
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
    INSERT INTO firewalls (id, name, ip, port, user, password, key, status, summary, lastSeen, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const encryptedPassword = data.password ? encrypt(data.password) : encrypt('');
  const encryptedKey = data.key ? encrypt(data.key) : null;
  const summary = data.summary ? JSON.stringify(data.summary) : null;
  
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
  const existingRow = db.prepare('SELECT password, key, summary FROM firewalls WHERE id = ?').get(id);
  
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
  
  const stmt = db.prepare(`
    UPDATE firewalls 
    SET name = ?, ip = ?, port = ?, user = ?, password = ?, key = ?, status = ?, summary = ?, lastSeen = ?, updatedAt = ?
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
  addFirewall,
  updateFirewall,
  deleteFirewall,
  updateStatus,
  getStats,
  closeDatabase,
  getUserByUsername,
  getUserById,
  createUser
};
