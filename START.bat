@echo off
echo ============================================
echo INT3 Firewall Admin - Sistema de Inicio
echo ============================================
echo.
echo Este script abrirá dos terminales:
echo 1. Backend (WebSocket + API REST + SQLite)
echo 2. Frontend (Next.js React)
echo.
echo El sistema guardará firewalls automáticamente.
echo.

REM Obtener ruta del proyecto
set PROJECT_DIR=%~dp0

echo [1/4] Verificando dependencias...
cd %PROJECT_DIR%backend
if not exist node_modules (
    echo Instalando dependencias del backend...
    call npm install
)

cd %PROJECT_DIR%
if not exist node_modules (
    echo Instalando dependencias del frontend...
    call npm install
)

echo [2/4] Creando carpeta de datos...
if not exist %PROJECT_DIR%backend\data mkdir %PROJECT_DIR%backend\data

echo [3/4] Iniciando Backend (Puerto 4000)...
start cmd.exe /k "cd /d %PROJECT_DIR%backend && npm run dev"

timeout /t 2 /nobreak

echo [4/4] Iniciando Frontend (Puerto 3000)...
start cmd.exe /k "cd /d %PROJECT_DIR% && npm run dev"

echo.
echo ============================================
echo ✓ Sistema iniciando...
echo ============================================
echo.
echo URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:4000
echo   API:      http://localhost:4000/api/firewalls
echo.
echo BD SQLite: %PROJECT_DIR%backend\data\firewalls.db
echo.
echo Esperando 5 segundos...
timeout /t 5

echo.
echo Abriendo navegador...
start http://localhost:3000

echo.
echo ✓ ¡Sistema listo! Ambas terminales se abrieron.
echo   - Frontend: React en http://localhost:3000
echo   - Backend: Node.js en http://localhost:4000
echo.
pause
