@echo off
chcp 65001 >nul
title Acompanhamento de Obras - Servidor local
cd /d "%~dp0"

echo.
echo  Pasta: %cd%
echo.

if not exist "index.html" (
  echo  ERRO: index.html nao encontrado nesta pasta.
  echo  Coloque este .bat na mesma pasta do index.html.
  echo.
  pause
  exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Python nao encontrado no PATH.
  echo  Instale o Python ou use: py -m http.server 8080
  echo.
  pause
  exit /b 1
)

echo  Servidor: http://localhost:8080
echo  O navegador deve abrir sozinho.
echo  Para encerrar: feche esta janela ou pressione Ctrl+C
echo.

start "" "http://localhost:8080/index.html"
python -m http.server 8080
pause
