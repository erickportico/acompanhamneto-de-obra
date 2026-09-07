@echo off
chcp 65001 >nul
title Acompanhamento de Obras - Express
cd /d "%~dp0"

echo.
echo  Pasta: %cd%
echo.

if not exist "index.html" (
  echo  ERRO: index.html nao encontrado nesta pasta.
  echo  Copie server.js, package.json e este .bat para a pasta do painel.
  echo.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Node.js nao encontrado.
  echo  Instale em https://nodejs.org  (versao LTS)
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo  Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo  Falha no npm install.
    pause
    exit /b 1
  )
)

set PORT=8080
echo  Abrindo http://127.0.0.1:%PORT%/index.html
echo  Para encerrar: feche esta janela ou Ctrl+C
echo.

start "" "http://127.0.0.1:%PORT%/index.html"
node server.js
pause
