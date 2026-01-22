@echo off
REM Script para generar certificados SSL auto-firmados para desarrollo/testing

setlocal enabledelayedexpansion

set DOMAIN=%1
if "%DOMAIN%"=="" set DOMAIN=localhost
set CERT_DIR=certs

echo.
echo ==========================================
echo   Generador de Certificados SSL
echo ==========================================
echo.
echo Generando certificados para: %DOMAIN%
echo.

REM Verificar si OpenSSL esta instalado
openssl version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] OpenSSL no esta instalado
    echo         Descarga desde: https://slproweb.com/products/Win32OpenSSL.html
    pause
    exit /b 1
)

REM Crear directorio si no existe
if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"

REM Generar certificado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout "%CERT_DIR%\privkey.pem" ^
  -out "%CERT_DIR%\fullchain.pem" ^
  -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=%DOMAIN%" ^
  2>nul

if errorlevel 1 (
    echo [ERROR] Fallo al generar certificados
    pause
    exit /b 1
)

echo.
echo [OK] Certificados generados exitosamente en: %CERT_DIR%\
echo.
echo Archivos creados:
echo   - %CERT_DIR%\fullchain.pem
echo   - %CERT_DIR%\privkey.pem
echo.
echo [WARNING] Estos son certificados auto-firmados
echo           Solo para desarrollo/testing. NO usar en produccion.
echo.
echo Para produccion, usa Let's Encrypt:
echo   certbot certonly --standalone -d %DOMAIN%
echo.
pause
