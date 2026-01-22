@echo off
REM ==========================================
REM Deploy Script - pfSense Firewall Hub
REM ==========================================
REM Script para Windows PowerShell

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   pfSense Firewall Hub - Deploy
echo ========================================
echo.

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta instalado o no esta en el PATH
    echo        Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [OK] Docker detectado
echo.

REM Verificar archivos de configuracion
echo Verificando archivos de configuracion...
if not exist ".env.production" (
    echo [ERROR] Archivo .env.production no encontrado
    echo         Copia .env.example a .env.production y configuralo
    pause
    exit /b 1
)

if not exist "backend\.env.production" (
    echo [ERROR] Archivo backend\.env.production no encontrado
    pause
    exit /b 1
)

echo [OK] Archivos de configuracion encontrados
echo.

REM Verificar certificados SSL
echo Verificando certificados SSL...
if not exist "certs" (
    echo [WARNING] Carpeta de certificados no existe
    echo           Creando carpeta certs...
    mkdir certs
    echo.
    echo Por favor, coloca tus certificados SSL en la carpeta 'certs':
    echo   - certs\fullchain.pem
    echo   - certs\privkey.pem
    echo.
    pause
)

if not exist "certs\fullchain.pem" (
    echo [ERROR] Certificado fullchain.pem no encontrado en certs\
    echo.
    echo Para desarrollo, genera certificados auto-firmados con:
    echo   openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
    echo     -keyout certs\privkey.pem -out certs\fullchain.pem
    pause
    exit /b 1
)

if not exist "certs\privkey.pem" (
    echo [ERROR] Certificado privkey.pem no encontrado en certs\
    pause
    exit /b 1
)

echo [OK] Certificados SSL encontrados
echo.

REM Detener contenedores existentes
echo Deteniendo contenedores existentes...
docker-compose down 2>nul
echo.

REM Build de imagenes
echo Construyendo imagenes Docker...
echo (Esto puede tomar varios minutos)
echo.
docker-compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Fallo al construir las imagenes
    pause
    exit /b 1
)

echo.
echo [OK] Build completado
echo.

REM Iniciar servicios
echo Iniciando servicios...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Fallo al iniciar los servicios
    pause
    exit /b 1
)

echo.
echo [OK] Servicios iniciados
echo.

REM Esperar y verificar
echo Esperando a que los servicios inicien...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   Deploy Completado!
echo ========================================
echo.
echo Estado de los servicios:
docker-compose ps
echo.
echo Accede a tu aplicacion en:
echo   https://tu-dominio.com
echo.
echo Comandos utiles:
echo   Ver logs:           docker-compose logs -f
echo   Logs de app:        docker-compose logs -f app
echo   Logs de nginx:      docker-compose logs -f nginx
echo   Detener servicios:  docker-compose down
echo   Reiniciar:          docker-compose restart
echo.
pause
