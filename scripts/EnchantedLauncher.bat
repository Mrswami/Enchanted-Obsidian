@echo off
TITLE Enchanted Obsidian: Sovereign Dev Engine

:: ── 🧹 SHADOW SWEEP (PURGING GHOSTS) ───────────────────────────────
taskkill /F /IM node.exe /T 2>NUL
taskkill /F /IM enchanted-obsidian.exe /T 2>NUL
taskkill /F /IM python.exe /T 2>NUL

echo // 🌌 MANIFESTING DECOUPLED DEV ENVIRONMENT...

:: ── 🛰️ SOVEREIGN BOT STARTUP ───────────────────────────────────────
:: This initiates the Discord bot in the background using the venv.
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c .\venv\Scripts\python.exe scripts\link_ingester_bot.py > scripts\bot_diag.log 2>&1' -WindowStyle Hidden"

:: ── 🌑 DETACHED APP SPAWN ──────────────────────────────────────────
:: This spawns the dev session and immediately exits the CMD window.
:: We use the 'tauri-dev' script to ensure cargo is in path.
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run tauri-dev' -WindowStyle Hidden"

exit
