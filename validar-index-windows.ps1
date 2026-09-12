$ErrorActionPreference = 'Stop'

$index = Join-Path (Get-Location) 'index.html'
$outDir = Join-Path (Get-Location) 'index-audit'

if (-not (Test-Path -LiteralPath $index)) {
    throw "Arquivo não encontrado: $index"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js não foi encontrado no PATH. Instale o Node.js LTS e abra um novo terminal."
}

if (Test-Path -LiteralPath $outDir) {
    Remove-Item -LiteralPath $outDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outDir | Out-Null

$html = Get-Content -LiteralPath $index -Raw -Encoding UTF8
$matches = [regex]::Matches($html, '(?is)<script\b[^>]*>(.*?)</script\s*>')

$scriptCount = 0
$fileCount = 0
$failures = New-Object System.Collections.Generic.List[string]

foreach ($match in $matches) {
    $scriptCount++
    $code = $match.Groups[1].Value

    if ([string]::IsNullOrWhiteSpace($code)) {
        continue
    }

    $fileCount++
    $file = Join-Path $outDir (('script-{0:D3}.js' -f $scriptCount))
    Set-Content -LiteralPath $file -Value $code -Encoding UTF8

    & node --check $file 2>&1 | Out-File -FilePath ($file + '.check.txt') -Encoding UTF8
    if ($LASTEXITCODE -ne 0) {
        $failures.Add($file)
    }
}

Write-Host "Tags script encontradas: $scriptCount"
Write-Host "Blocos JavaScript extraídos: $fileCount"

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "FALHAS DE SINTAXE: $($failures.Count)" -ForegroundColor Red
    foreach ($file in $failures) {
        Write-Host "--- $file ---" -ForegroundColor Yellow
        Get-Content -LiteralPath ($file + '.check.txt')
    }
    exit 1
}

Write-Host "OK: todos os blocos JavaScript passaram no node --check." -ForegroundColor Green

$badTokens = @(
    'pronto=t rue',
    'd ocument',
    'U RL',
    'J SON',
    'n ew'
)

$foundBad = $false
foreach ($token in $badTokens) {
    if ($html.Contains($token)) {
        Write-Host "Token corrompido encontrado: $token" -ForegroundColor Red
        $foundBad = $true
    }
}

if ($foundBad) {
    exit 2
}

Write-Host "OK: tokens corrompidos não encontrados." -ForegroundColor Green
