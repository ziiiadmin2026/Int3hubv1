const db = require('./backend/db');
const auth = require('./backend/auth');

async function testLogin() {
  console.log('=== Test de Login ===\n');
  
  // 1. Verificar si el usuario existe
  const user = db.getUserByUsername('admin');
  console.log('1. Usuario encontrado:', user ? 'SI' : 'NO');
  
  if (!user) {
    console.log('ERROR: Usuario admin no existe en la base de datos');
    return;
  }
  
  console.log('   Username:', user.username);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Hash length:', user.passwordHash.length);
  console.log('   Hash format:', user.passwordHash.substring(0, 4) + '...');
  
  // 2. Probar verificación de contraseña
  console.log('\n2. Probando contraseña "admin"...');
  try {
    const isValid = await auth.verifyPassword('admin', user.passwordHash);
    console.log('   Resultado:', isValid ? 'VALIDA ✓' : 'INVALIDA ✗');
    
    if (!isValid) {
      console.log('\n3. Intentando recrear hash...');
      const newHash = await auth.hashPassword('admin');
      console.log('   Nuevo hash creado:', newHash.substring(0, 20) + '...');
      const testNew = await auth.verifyPassword('admin', newHash);
      console.log('   Verificación del nuevo hash:', testNew ? 'OK ✓' : 'FALLA ✗');
    }
  } catch (err) {
    console.log('   ERROR:', err.message);
  }
}

testLogin().then(() => {
  console.log('\n=== Fin del test ===');
  process.exit(0);
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
