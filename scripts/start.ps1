# Avvia backend e frontend. Esegui dalla cartella principale: .\scripts\start.ps1
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\api'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } |
  Select-Object -First 1).IPAddress

Write-Host "PC:      http://localhost:5173" -ForegroundColor Green
Write-Host "iPhone:  http://${ip}:5173  (stessa rete Wi-Fi)" -ForegroundColor Green

Set-Location "$root\apps\web"
npm run dev
