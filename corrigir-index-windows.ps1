$ErrorActionPreference = 'Stop'

$index = Join-Path (Get-Location) 'index.html'
$replacementFile = Join-Path (Get-Location) 'p84-correcao-trecho.txt'

if (-not (Test-Path -LiteralPath $index)) {
    throw "Arquivo não encontrado: $index"
}

if (-not (Test-Path -LiteralPath $replacementFile)) {
    throw "Arquivo de substituição não encontrado: $replacementFile"
}

$html = Get-Content -LiteralPath $index -Raw -Encoding UTF8
$replacement = Get-Content -LiteralPath $replacementFile -Raw -Encoding UTF8

$start = 'janelaImpressao.document.write(''<!doctype html><html><head><meta charset="UTF-8"><title>Diario de Obra</title>'
$end = '    <!-- PATCH155:'

$startIndex = $html.IndexOf($start, [System.StringComparison]::Ordinal)
$endIndex = $html.IndexOf($end, [System.StringComparison]::Ordinal)

if ($startIndex -lt 0) {
    throw 'Início corrompido do Diário de Obra não foi encontrado. Nenhuma alteração foi feita.'
}

if ($endIndex -lt 0 -or $endIndex -le $startIndex) {
    throw 'Marcador PATCH155 não foi encontrado depois do trecho corrompido. Nenhuma alteração foi feita.'
}

$occurrences = ([regex]::Matches($html, [regex]::Escape($start))).Count
if ($occurrences -ne 1) {
    throw "Foram encontrados $occurrences inícios do trecho corrompido; esperado exatamente 1. Nenhuma alteração foi feita."
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path (Get-Location) ("index.html.bak-before-fix-$stamp")
Copy-Item -LiteralPath $index -Destination $backup -Force

$before = $html.Substring(0, $startIndex)
$after = $html.Substring($endIndex)
$newHtml = $before + $replacement.Trim() + "`r`n`r`n" + $after

Set-Content -LiteralPath $index -Value $newHtml -Encoding UTF8

Write-Host "Correção aplicada com sucesso." -ForegroundColor Green
Write-Host "Backup criado: $backup"
Write-Host "Trecho substituído: do início corrompido do Diário de Obra até antes do PATCH155."
Write-Host "Agora execute: .\validar-index-windows.ps1"
