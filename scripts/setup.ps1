# Installa tutto (una sola volta). Esegui dalla cartella principale: .\scripts\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Backend ==" -ForegroundColor Cyan
Set-Location "$root\apps\api"
python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pytest -q

Write-Host "== Frontend ==" -ForegroundColor Cyan
Set-Location "$root\apps\web"
npm install

Write-Host "Fatto. Ora lancia: .\scripts\start.ps1" -ForegroundColor Green
