$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pythonExe = Join-Path $root "venv\Scripts\python.exe"
$frontendModules = Join-Path $frontendDir "node_modules"

if (-not (Test-Path -LiteralPath $pythonExe)) {
    Write-Host "Backend virtual environment was not found at: $pythonExe" -ForegroundColor Red
    Write-Host "Create it first, then install backend dependencies:" -ForegroundColor Yellow
    Write-Host "  python -m venv venv"
    Write-Host "  .\venv\Scripts\python.exe -m pip install -r backend\requirements.txt"
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $backendDir ".env"))) {
    Write-Host "Backend .env was not found at: backend\.env" -ForegroundColor Red
    Write-Host "Create it from backend\.env.example before starting the backend." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path -LiteralPath $frontendModules)) {
    Write-Host "Frontend dependencies are missing." -ForegroundColor Yellow
    Write-Host "Run this once before starting the frontend:"
    Write-Host "  cd frontend"
    Write-Host "  pnpm install"
    exit 1
}

Write-Host "Starting Django backend on http://localhost:8000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$backendDir`"; `"$pythonExe`" manage.py runserver"
)

Write-Host "Starting Vite frontend on http://localhost:5173" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd `"$frontendDir`"; pnpm run dev"
)

Write-Host ""
Write-Host "Both servers were launched in separate PowerShell windows." -ForegroundColor Green
Write-Host "Close those windows to stop the servers."
