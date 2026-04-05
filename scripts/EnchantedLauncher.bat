@echo off
TITLE Enchanted Obsidian: Sovereign Dev Engine

:: ── 🧹 SHADOW SWEEP (PURGING GHOSTS) ───────────────────────────────
taskkill /F /IM node.exe /T 2>NUL
taskkill /F /IM enchanted-obsidian.exe /T 2>NUL
taskkill /F /IM python.exe /T 2>NUL

echo // 🌌 MANIFESTING DECOUPLED DEV ENVIRONMENT...

:: ── 🌑 DETACHED SPAWN ──────────────────────────────────────────────
:: This spawns the dev session and immediately exits the CMD window.
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run tauri dev' -WindowStyle Hidden"

exit
