@echo off
REM ==========================================
REM Pre-Deploy Verification Script (Windows)
REM ==========================================
setlocal enabledelayedexpansion

set ERRORS=0
set WARNINGS=0

echo.
echo ==========================================
echo   Pre-Deploy Verification
echo ==========================================
echo.

REM 1. Docker
echo 1. Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no esta instalado
    set /a ERRORS+=1
) else (
    echo [OK] Docker instalado
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose no esta instalado
    set /a ERRORS+=1
) else (
    echo [OK] Docker Compose instalado
)

echo.
echo 2. Verificando archivos de configuracion...

REM .env.production
if exist ".env.production" (
    echo [OK] Archivo .env.production existe
    findstr /C:"tu-dominio.com" .env.production >nul 2>&1
    if not errorlevel 1 (
        echo [WARNING] Dominio no configurado en .env.production
        set /a WARNINGS+=1
    ) else (
        echo [OK] Dominio configurado en .env.production
    )
) else (
    echo [ERROR] Archivo .env.production no encontrado
    set /a ERRORS+=1
)

REM backend/.env.production
if exist "backend\.env.production" (
    echo [OK] Archivo backend\.env.production existe
    findstr /C:"CAMBIAR_ESTO" backend\.env.production >nul 2>&1
    if not errorlevel 1 (
        echo [ERROR] Variables de entorno no configuradas
        echo         Genera claves con: openssl rand -hex 32
        set /a ERRORS+=1
    ) else (
        echo [OK] Variables de entorno configuradas
    )
) else (
    echo [ERROR] Archivo backend\.env.production no encontrado
    set /a ERRORS+=1
)

REM nginx config
if exist "docker\nginx\conf.d\site.conf" (
    echo [OK] Configuracion de nginx existe
    findstr /C:"your-domain.com" docker\nginx\conf.d\site.conf >nul 2>&1
    if not errorlevel 1 (
        echo [WARNING] Dominio no configurado en site.conf
        set /a WARNINGS+=1
    ) else (
        echo [OK] Dominio configurado en site.conf
    )
) else (
    echo [ERROR] Configuracion de nginx no encontrada
    set /a ERRORS+=1
)

echo.
echo 3. Verificando certificados SSL...

if exist "certs" (
    echo [OK] Carpeta certs existe
    if exist "certs\fullchain.pem" (
        echo [OK] Certificado fullchain.pem encontrado
    ) else (
        echo [ERROR] Certificado fullchain.pem no encontrado
        set /a ERRORS+=1
    )
    if exist "certs\privkey.pem" (
        echo [OK] Certificado privkey.pem encontrado
    ) else (
        echo [ERROR] Certificado privkey.pem no encontrado
        set /a ERRORS+=1
    )
) else (
    echo [ERROR] Carpeta certs no existe
    set /a ERRORS+=1
)

echo.
echo 4. Verificando estructura de directorios...

set DIRS=backend docker\nginx\conf.d pages components public
for %%d in (%DIRS%) do (
    if exist "%%d" (
        echo [OK] Directorio %%d existe
    ) else (
        echo [ERROR] Directorio %%d no encontrado
        set /a ERRORS+=1
    )
)

echo.
echo 5. Verificando archivos clave...

set FILES=package.json backend\package.json Dockerfile docker-compose.yml next.config.js
for %%f in (%FILES%) do (
    if exist "%%f" (
        echo [OK] Archivo %%f existe
    ) else (
        echo [ERROR] Archivo %%f no encontrado
        set /a ERRORS+=1
    )
)

echo.
echo ==========================================
echo   Resumen
echo ==========================================
echo.

if !ERRORS! EQU 0 (
    if !WARNINGS! EQU 0 (
        echo [OK] Todo listo para deploy!
        echo.
        echo Ejecuta: deploy.bat
        pause
        exit /b 0
    ) else (
        echo [WARNING] !WARNINGS! advertencias encontradas
        echo.
        echo Puedes continuar, pero revisa las advertencias.
        echo.
        set /p CONTINUE="Deseas continuar de todas formas? (y/N): "
        if /i "!CONTINUE!" EQU "y" (
            echo Ejecuta: deploy.bat
            pause
            exit /b 0
        ) else (
            exit /b 1
        )
    )
) else (
    echo [ERROR] !ERRORS! errores encontrados
    if !WARNINGS! GTR 0 (
        echo [WARNING] !WARNINGS! advertencias encontradas
    )
    echo.
    echo Por favor corrige los errores antes de continuar.
    echo Consulta: PRE-DEPLOY-CHECKLIST.md
    pause
    exit /b 1
)
